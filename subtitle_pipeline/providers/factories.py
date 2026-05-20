from .adapters import EdgeTTSProvider, FasterWhisperProvider, TranslatorProviderAdapter
from .contracts import TTSProvider, TranscriptionProvider, TranslationProvider
from .openai_compatible import OpenAICompatibleTranslationProvider
from ..errors import ProviderNotFoundError


def create_transcription_provider(config) -> TranscriptionProvider:
    if config.transcription_provider == "faster-whisper":
        return FasterWhisperProvider(config.transcription_model, config.device)
    raise ProviderNotFoundError(
        f"Unsupported transcription provider: {config.transcription_provider}"
    )


def create_translation_provider(config) -> TranslationProvider:
    if config.translation_provider in {"nano-gpt", "openai"}:
        return OpenAICompatibleTranslationProvider(
            provider_name=config.translation_provider,
            source_lang=config.source_lang,
            target_lang=config.target_lang,
            api_key=config.api_key,
            model=config.translation_model,
        )
    if config.translation_provider in {"claude", "nllb"}:
        return TranslatorProviderAdapter(
            provider_name=config.translation_provider,
            source_lang=config.source_lang,
            target_lang=config.target_lang,
            api_key=config.api_key,
            model=config.translation_model,
        )
    raise ProviderNotFoundError(
        f"Translation provider '{config.translation_provider}' is registered "
        "but does not have a runtime adapter yet."
    )


def create_tts_provider(config) -> TTSProvider:
    if config.tts_provider == "edge-tts":
        return EdgeTTSProvider(config.tts_model)
    raise ProviderNotFoundError(f"Unsupported TTS provider: {config.tts_provider}")
