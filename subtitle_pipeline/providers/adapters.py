from ..models import Segment
from ..errors import TranslationError
from .contracts import (
    ProviderCapabilities,
    ProviderConfig,
    ProviderResultMetadata,
    TTSResult,
    TranscriptionResult,
    TranslationResult,
)
from .registry import get_provider_capabilities


class FasterWhisperProvider:
    def __init__(self, model_size: str = "large-v3", device: str = "auto"):
        self.config = ProviderConfig(
            name="faster-whisper",
            task="transcription",
            model=model_size,
            options={"device": device},
        )
        self._model_size = model_size
        self._device = device
        self._transcriber = None

    def capabilities(self) -> ProviderCapabilities:
        return get_provider_capabilities(self.config.name)

    def transcribe(self, audio_path: str, language: str) -> TranscriptionResult:
        if self._transcriber is None:
            from ..transcriber import FasterWhisperTranscriber

            self._transcriber = FasterWhisperTranscriber(self._model_size, self._device)
        segments = self._transcriber.transcribe(audio_path, language)
        return TranscriptionResult(
            segments=segments,
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
                privacy_level=self.capabilities().privacy_level,
            ),
        )


class TranslatorProviderAdapter:
    def __init__(
        self,
        provider_name: str,
        source_lang: str,
        target_lang: str,
        api_key: str | None = None,
        model: str | None = None,
    ):
        capabilities = get_provider_capabilities(provider_name)
        self.config = ProviderConfig(
            name=provider_name,
            task="translation",
            model=model or default_translation_model(provider_name),
            api_key_env_var=capabilities.api_key_env_var,
            base_url=capabilities.base_url,
        )
        self._source_lang = source_lang
        self._target_lang = target_lang
        self._api_key = api_key
        self._translator = None
        self._capabilities = capabilities

    def capabilities(self) -> ProviderCapabilities:
        return self._capabilities

    def translate_segments(
        self,
        segments: list[Segment],
        source_lang: str,
        target_lang: str,
    ) -> TranslationResult:
        translator = self._get_translator(source_lang, target_lang)
        translated = translator.translate_segments(segments)
        return TranslationResult(
            segments=translated,
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
                api_provider=self.config.name,
                base_url=self.config.base_url,
                privacy_level=self.capabilities().privacy_level,
            ),
        )

    def _get_translator(self, source_lang: str, target_lang: str):
        if self._translator is None:
            from ..translator import ClaudeTranslator, NLLBTranslator

            if self.config.name == "claude":
                self._translator = ClaudeTranslator(source_lang, target_lang, self._api_key)
            elif self.config.name == "nllb":
                self._translator = NLLBTranslator(source_lang, target_lang)
            else:
                raise TranslationError(f"Unsupported translation provider: {self.config.name}")
        return self._translator


class EdgeTTSProvider:
    def __init__(self, model: str = "edge-tts"):
        self.config = ProviderConfig(
            name="edge-tts",
            task="tts",
            model=model,
            base_url=get_provider_capabilities("edge-tts").base_url,
        )

    def capabilities(self) -> ProviderCapabilities:
        return get_provider_capabilities(self.config.name)

    def synthesize_segments(
        self,
        segments: list[Segment],
        output_dir: str,
        voice: str,
        rate: int,
        use_translated: bool = True,
    ) -> TTSResult:
        from ..tts import synthesize_segments

        audio_paths = synthesize_segments(segments, output_dir, voice, rate, use_translated)
        return TTSResult(
            audio_paths=audio_paths,
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
                api_provider=self.config.name,
                base_url=self.config.base_url,
                privacy_level=self.capabilities().privacy_level,
            ),
        )


def default_translation_model(provider_name: str) -> str:
    if provider_name == "claude":
        return "claude-sonnet-4-20250514"
    if provider_name == "nllb":
        return "facebook/nllb-200-distilled-600M"
    raise TranslationError(f"Unsupported translation provider: {provider_name}")
