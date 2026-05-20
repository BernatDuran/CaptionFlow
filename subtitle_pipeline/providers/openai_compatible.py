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
                response = self._client.audio.transcriptions.create(
                    model=model,
                    file=audio_file,
                    language=language,
                    response_format="verbose_json",
                )
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


def default_openai_compatible_transcription_model(provider_name: str) -> str:
    if provider_name in {"nano-gpt-whisper", "openai-whisper"}:
        return "whisper-1"
    raise TranscriptionError(
        f"Unsupported OpenAI-compatible transcription provider: {provider_name}"
    )


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
    return (
        f"Translate from {source_lang} to {target_lang}.\n"
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
