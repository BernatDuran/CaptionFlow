from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol

from ..errors import ProviderAuthError, ProviderRuntimeError, TranscriptionError, TranslationError
from ..models import Segment
from .contracts import (
    ProviderCapabilities,
    ProviderConfig,
    ProviderResultMetadata,
    TranscriptionResult,
    TranslationResult,
)
from .registry import get_provider_capabilities


class ChatCompletionClient(Protocol):
    def create_chat_completion(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        max_tokens: int,
        temperature: float,
    ) -> "ChatCompletionResult":
        ...


class AudioTranscriptionClient(Protocol):
    def create_audio_transcription(
        self,
        *,
        model: str,
        audio_path: str,
        language: str,
    ) -> list[Segment]:
        ...


@dataclass(frozen=True)
class ChatCompletionResult:
    text: str
    estimated_cost: float | None = None
    warnings: list[str] | None = None


class OpenAICompatibleClient:
    def __init__(
        self,
        *,
        api_key_env_var: str,
        api_key: str | None = None,
        base_url: str | None = None,
    ):
        key = api_key or os.environ.get(api_key_env_var)
        if not key:
            raise ProviderAuthError(f"Missing API key in {api_key_env_var}")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ProviderRuntimeError("Python package 'openai' is not installed.") from exc

        kwargs = {"api_key": key}
        if base_url:
            kwargs["base_url"] = base_url
        self._client = OpenAI(**kwargs)

    def create_chat_completion(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        max_tokens: int,
        temperature: float,
    ) -> ChatCompletionResult:
        try:
            response = self._client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except Exception as exc:
            raise ProviderRuntimeError(f"OpenAI-compatible chat request failed: {exc}") from exc

        text = response.choices[0].message.content or ""
        return ChatCompletionResult(text=text)

    def create_audio_transcription(
        self,
        *,
        model: str,
        audio_path: str,
        language: str,
    ) -> list[Segment]:
        try:
            with open(audio_path, "rb") as audio_file:
                kwargs = {
                    "model": model,
                    "file": audio_file,
                    "response_format": "verbose_json",
                }
                if language and language.lower() != "auto":
                    kwargs["language"] = language
                response = self._client.audio.transcriptions.create(**kwargs)
        except Exception as exc:
            raise ProviderRuntimeError(f"OpenAI-compatible transcription failed: {exc}") from exc

        raw_segments = getattr(response, "segments", None)
        if not raw_segments:
            raise ProviderRuntimeError("Transcription provider did not return timed segments.")

        segments = []
        for raw_segment in raw_segments:
            segments.append(
                Segment(
                    start=float(_get_response_value(raw_segment, "start")),
                    end=float(_get_response_value(raw_segment, "end")),
                    text=str(_get_response_value(raw_segment, "text")).strip(),
                )
            )
        return segments


class NanoGPTWhisperClient:
    """HTTP adapter for the NanoGPT Whisper transcription endpoint.

    NanoGPT does not guarantee the same response structure as OpenAI's
    verbose_json format.  This client:
    - Calls the raw transcription endpoint via the openai SDK (same base_url
      and api_key wiring as OpenAICompatibleClient) but requests plain JSON.
    - Parses the response defensively, accepting any of the known shapes that
      NanoGPT may return (``text``, ``transcription``, ``result``,
      ``result.text``).
    - Returns a *single* Segment spanning the whole audio when NanoGPT does not
      provide timed sub-segments (NanoGPT Whisper typically returns a flat
      transcript, not verbose segments).
    """

    def __init__(
        self,
        *,
        api_key_env_var: str,
        api_key: str | None = None,
        base_url: str | None = None,
    ):
        key = api_key or os.environ.get(api_key_env_var)
        if not key:
            raise ProviderAuthError(f"Missing API key in {api_key_env_var}")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ProviderRuntimeError("Python package 'openai' is not installed.") from exc

        kwargs: dict = {"api_key": key}
        if base_url:
            kwargs["base_url"] = base_url
        self._client = OpenAI(**kwargs)

    def create_audio_transcription(
        self,
        *,
        model: str,
        audio_path: str,
        language: str,
    ) -> list[Segment]:
        """Call NanoGPT's transcription endpoint and return normalised Segments."""
        try:
            with open(audio_path, "rb") as audio_file:
                # Do NOT force response_format: NanoGPT may ignore or reject it.
                # Let NanoGPT respond in its native format and normalise below.
                kwargs = {
                    "model": model,
                    "file": audio_file,
                }
                if language and language.lower() != "auto":
                    kwargs["language"] = language
                response = self._client.audio.transcriptions.create(**kwargs)
        except Exception as exc:
            raise ProviderRuntimeError(
                f"NanoGPT Whisper transcription request failed: {exc}"
            ) from exc

        # NanoGPT may return the SDK object directly or a plain dict.
        raw: object = response
        text = _extract_nanogpt_transcript_text(raw)

        # NanoGPT Whisper does not return timed sub-segments in its current API;
        # expose the full transcript as a single segment with placeholder timing.
        return [Segment(start=0.0, end=0.0, text=text)]


class NanoGPTWhisperTranscriptionProvider:
    """Transcription provider adapter specifically for NanoGPT Whisper.

    Wraps :class:`NanoGPTWhisperClient` and exposes the standard
    :class:`TranscriptionProvider` protocol expected by the pipeline.
    """

    def __init__(
        self,
        *,
        model: str | None = None,
        api_key: str | None = None,
        client: AudioTranscriptionClient | None = None,
    ):
        capabilities = get_provider_capabilities("nano-gpt-whisper")
        self.config = ProviderConfig(
            name="nano-gpt-whisper",
            task="transcription",
            model=model or DEFAULT_NANOGPT_WHISPER_MODEL,
            api_key_env_var=capabilities.api_key_env_var,
            base_url=capabilities.base_url,
        )
        self._api_key = api_key
        self._client = client
        self._capabilities = capabilities

    def capabilities(self) -> ProviderCapabilities:
        return self._capabilities

    def transcribe(self, audio_path: str, language: str) -> TranscriptionResult:
        client = self._client or NanoGPTWhisperClient(
            api_key_env_var=self.config.api_key_env_var or "",
            api_key=self._api_key,
            base_url=self.config.base_url,
        )
        segments = client.create_audio_transcription(
            model=self.config.model,
            audio_path=audio_path,
            language=language,
        )
        return TranscriptionResult(
            segments=segments,
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
                api_provider=self.config.name,
                base_url=self.config.base_url,
                privacy_level=self.capabilities().privacy_level,
            ),
        )


class OpenAICompatibleTranscriptionProvider:
    def __init__(
        self,
        provider_name: str,
        *,
        model: str | None = None,
        api_key: str | None = None,
        client: AudioTranscriptionClient | None = None,
    ):
        capabilities = get_provider_capabilities(provider_name)
        self.config = ProviderConfig(
            name=provider_name,
            task="transcription",
            model=model or default_openai_compatible_transcription_model(provider_name),
            api_key_env_var=capabilities.api_key_env_var,
            base_url=capabilities.base_url,
        )
        self._api_key = api_key
        self._client = client
        self._capabilities = capabilities

    def capabilities(self) -> ProviderCapabilities:
        return self._capabilities

    def transcribe(self, audio_path: str, language: str) -> TranscriptionResult:
        client = self._client or OpenAICompatibleClient(
            api_key_env_var=self.config.api_key_env_var or "",
            api_key=self._api_key,
            base_url=self.config.base_url,
        )
        segments = client.create_audio_transcription(
            model=self.config.model,
            audio_path=audio_path,
            language=language,
        )
        return TranscriptionResult(
            segments=segments,
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
                api_provider=self.config.name,
                base_url=self.config.base_url,
                privacy_level=self.capabilities().privacy_level,
            ),
        )


class OpenAICompatibleTranslationProvider:
    def __init__(
        self,
        provider_name: str,
        source_lang: str,
        target_lang: str,
        *,
        model: str | None = None,
        api_key: str | None = None,
        client: ChatCompletionClient | None = None,
        glossary: dict[str, str] | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ):
        capabilities = get_provider_capabilities(provider_name)
        self.config = ProviderConfig(
            name=provider_name,
            task="translation",
            model=model or default_openai_compatible_translation_model(provider_name),
            api_key_env_var=capabilities.api_key_env_var,
            base_url=capabilities.base_url,
            options={"temperature": temperature, "max_tokens": max_tokens},
        )
        self._source_lang = source_lang
        self._target_lang = target_lang
        self._api_key = api_key
        self._client = client
        self._glossary = glossary or {}
        self._capabilities = capabilities

    def capabilities(self) -> ProviderCapabilities:
        return self._capabilities

    def translate_segments(
        self,
        segments: list[Segment],
        source_lang: str,
        target_lang: str,
    ) -> TranslationResult:
        if not segments:
            return TranslationResult(
                segments=[],
                metadata=self._metadata(estimated_cost=None, warnings=[]),
            )

        client = self._client or OpenAICompatibleClient(
            api_key_env_var=self.config.api_key_env_var or "",
            api_key=self._api_key,
            base_url=self.config.base_url,
        )
        response = client.create_chat_completion(
            model=self.config.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Translate numbered subtitle lines. Preserve numbering, "
                        "segment count, meaning, names and timing."
                    ),
                },
                {
                    "role": "user",
                    "content": _build_translation_prompt(
                        segments,
                        source_lang,
                        target_lang,
                        glossary=self._glossary,
                    ),
                },
            ],
            max_tokens=int(self.config.options["max_tokens"]),
            temperature=float(self.config.options["temperature"]),
        )
        translated_texts = _parse_numbered_lines(response.text, expected_count=len(segments))
        translated_segments = [
            Segment(
                start=segment.start,
                end=segment.end,
                text=segment.text,
                translated=translated,
            )
            for segment, translated in zip(segments, translated_texts)
        ]
        return TranslationResult(
            segments=translated_segments,
            metadata=self._metadata(
                estimated_cost=response.estimated_cost,
                warnings=response.warnings or [],
            ),
        )

    def _metadata(
        self,
        *,
        estimated_cost: float | None,
        warnings: list[str],
    ) -> ProviderResultMetadata:
        return ProviderResultMetadata(
            provider=self.config.name,
            model=self.config.model,
            task=self.config.task,
            api_provider=self.config.name,
            base_url=self.config.base_url,
            privacy_level=self.capabilities().privacy_level,
            estimated_cost=estimated_cost,
            warnings=warnings,
        )


def default_openai_compatible_translation_model(provider_name: str) -> str:
    if provider_name == "nano-gpt":
        return "qwen/qwen3.5-397b-a17b"
    if provider_name == "openai":
        return "gpt-4o-mini"
    raise TranslationError(f"Unsupported OpenAI-compatible translation provider: {provider_name}")


#: Default model used by NanoGPT Whisper when none is specified via the UI/config.
DEFAULT_NANOGPT_WHISPER_MODEL = "whisper-1"


def default_openai_compatible_transcription_model(provider_name: str) -> str:
    if provider_name == "openai-whisper":
        return "whisper-1"
    if provider_name == "nano-gpt-whisper":
        return DEFAULT_NANOGPT_WHISPER_MODEL
    raise TranscriptionError(
        f"Unsupported OpenAI-compatible transcription provider: {provider_name}"
    )


def _extract_nanogpt_transcript_text(raw: object) -> str:
    """Normalise a NanoGPT Whisper response into a plain transcript string.

    Accepted shapes (tried in order):
    - Attribute/key ``text``          → OpenAI-like flat response (json / verbose_json)
    - Attribute/key ``transcription`` → alternative NanoGPT field name
    - Attribute/key ``result``        → bare string result
    - Attribute/key ``result`` with sub-key ``text``  → nested result object
    - Attribute/key ``segments`` (list) → verbose_json fallback: concatenate .text of each segment

    Raises :class:`~subtitle_pipeline.errors.ProviderRuntimeError` with a
    clear, actionable message if none of the known shapes match.
    """
    # Helper to extract a value whether `raw` is a dict or an object.
    def _get(obj: object, key: str) -> object | None:
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)

    # 1. text  (covers OpenAI json AND verbose_json top-level .text)
    value = _get(raw, "text")
    if isinstance(value, str) and value.strip():
        return value.strip()

    # 2. transcription
    value = _get(raw, "transcription")
    if isinstance(value, str) and value.strip():
        return value.strip()

    # 3. result  (may be a bare string or a nested object)
    result = _get(raw, "result")
    if isinstance(result, str) and result.strip():
        return result.strip()
    if result is not None:
        # 3b. result.text
        nested = _get(result, "text")
        if isinstance(nested, str) and nested.strip():
            return nested.strip()

    # 4. segments list fallback (verbose_json without top-level .text)
    #    NanoGPT may return a verbose_json structure where .text is empty/missing
    #    but .segments contains individual timed entries with their own .text.
    segments_value = _get(raw, "segments")
    if isinstance(segments_value, list) and segments_value:
        parts = []
        for seg in segments_value:
            seg_text = _get(seg, "text")
            if isinstance(seg_text, str) and seg_text.strip():
                parts.append(seg_text.strip())
        if parts:
            return " ".join(parts)

    # None of the known shapes matched — raise a clear, actionable error.
    if isinstance(raw, dict):
        available_keys = list(raw.keys())
    else:
        available_keys = [
            k for k in dir(raw) if not k.startswith("_")
        ]
    raise ProviderRuntimeError(
        "NanoGPT Whisper returned an unrecognised response format. "
        "Expected one of: 'text', 'transcription', 'result', 'result.text', or 'segments[].text'. "
        f"Available keys/attributes in the response: {available_keys}. "
        "Check the NanoGPT API documentation or inspect the raw response above."
    )


_LANGUAGE_NAMES = {
    "es": "Spanish",
    "en": "English",
    "ca": "Catalan",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "auto": "the original language",
}

def _build_translation_prompt(
    segments: list[Segment],
    source_lang: str,
    target_lang: str,
    *,
    glossary: dict[str, str] | None = None,
) -> str:
    numbered = "\n".join(
        f"{index}. {segment.text.strip()}" for index, segment in enumerate(segments, start=1)
    )
    glossary_block = ""
    if glossary:
        terms = "\n".join(f"- {source} => {target}" for source, target in glossary.items())
        glossary_block = f"\nGlossary terms to preserve:\n{terms}\n"
        
    src_name = _LANGUAGE_NAMES.get(source_lang.lower(), source_lang)
    tgt_name = _LANGUAGE_NAMES.get(target_lang.lower(), target_lang)
    
    return (
        f"Translate from {src_name} to {tgt_name}.\n"
        "Return exactly the same number of numbered lines.\n"
        "Output only numbered translations in the form '1. translated text'.\n\n"
        f"{glossary_block}"
        f"{numbered}"
    )


def _parse_numbered_lines(text: str, *, expected_count: int) -> list[str]:
    translations_by_index: dict[int, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or "." not in line:
            continue
        prefix, value = line.split(".", 1)
        if not prefix.isdigit():
            continue
        index = int(prefix)
        translations_by_index[index] = value.strip()

    translations = [
        translations_by_index[index] for index in range(1, expected_count + 1)
        if index in translations_by_index
    ]
    if len(translations) != expected_count:
        raise TranslationError(
            "Translation provider returned a different number of segments: "
            f"expected {expected_count}, got {len(translations)}"
        )
    return translations


def _get_response_value(raw_segment: object, key: str) -> object:
    if isinstance(raw_segment, dict):
        return raw_segment[key]
    return getattr(raw_segment, key)


# ---------------------------------------------------------------------------
# Gemini Translation Provider
# ---------------------------------------------------------------------------

DEFAULT_GEMINI_TRANSLATION_MODEL = "gemini-2.0-flash"


class GeminiTranslationProvider:
    """Translation provider using the Google Gemini API (``google-genai`` SDK).

    Follows the same prompt architecture as :class:`OpenAICompatibleTranslationProvider`
    (numbered-lines prompt → numbered-lines response), so translation quality
    and parsing behaviour are consistent across providers.
    """

    def __init__(
        self,
        *,
        source_lang: str,
        target_lang: str,
        model: str | None = None,
        api_key: str | None = None,
        glossary: dict[str, str] | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ):
        capabilities = get_provider_capabilities("gemini")
        self.config = ProviderConfig(
            name="gemini",
            task="translation",
            model=model or DEFAULT_GEMINI_TRANSLATION_MODEL,
            api_key_env_var=capabilities.api_key_env_var,
            options={"temperature": temperature, "max_tokens": max_tokens},
        )
        self._source_lang = source_lang
        self._target_lang = target_lang
        self._api_key = api_key
        self._glossary = glossary or {}
        self._capabilities = capabilities

        # Lazy-import google-genai so the rest of the codebase does not
        # require the package when Gemini is not selected.
        try:
            from google import genai
        except ImportError as exc:
            raise ProviderRuntimeError(
                "Python package 'google-genai' is not installed. "
                "Run: pip install google-genai"
            ) from exc

        key = api_key or os.environ.get(capabilities.api_key_env_var or "")
        if not key:
            raise ProviderAuthError(
                f"Missing API key for Gemini. Set {capabilities.api_key_env_var}."
            )
        self._client = genai.Client(api_key=key)

    def capabilities(self) -> ProviderCapabilities:
        return self._capabilities

    def translate_segments(
        self,
        segments: list[Segment],
        source_lang: str,
        target_lang: str,
    ) -> TranslationResult:
        if not segments:
            return TranslationResult(
                segments=[],
                metadata=self._metadata(estimated_cost=None, warnings=[]),
            )

        from google.genai import types

        system_instruction = (
            "Translate numbered subtitle lines. Preserve numbering, "
            "segment count, meaning, names and timing."
        )
        user_prompt = _build_translation_prompt(
            segments,
            source_lang,
            target_lang,
            glossary=self._glossary,
        )

        try:
            response = self._client.models.generate_content(
                model=self.config.model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=float(self.config.options["temperature"]),
                    max_output_tokens=int(self.config.options["max_tokens"]),
                ),
            )
        except Exception as exc:
            raise ProviderRuntimeError(
                f"Gemini translation request failed: {exc}"
            ) from exc

        if not response.text:
            raise TranslationError(
                "Gemini returned an empty response. Check model name and API key."
            )

        translated_texts = _parse_numbered_lines(
            response.text, expected_count=len(segments)
        )
        translated_segments = [
            Segment(
                start=segment.start,
                end=segment.end,
                text=segment.text,
                translated=translated,
            )
            for segment, translated in zip(segments, translated_texts)
        ]
        return TranslationResult(
            segments=translated_segments,
            metadata=self._metadata(estimated_cost=None, warnings=[]),
        )

    def _metadata(
        self,
        *,
        estimated_cost: float | None,
        warnings: list[str],
    ) -> ProviderResultMetadata:
        return ProviderResultMetadata(
            provider=self.config.name,
            model=self.config.model,
            task=self.config.task,
            api_provider=self.config.name,
            privacy_level=self.capabilities().privacy_level,
            estimated_cost=estimated_cost,
            warnings=warnings,
        )

