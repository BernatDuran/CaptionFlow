from .adapters import EdgeTTSProvider, FasterWhisperProvider, TranslatorProviderAdapter
from .contracts import TTSProvider, TranscriptionProvider, TranslationProvider
from ..errors import ProviderNotFoundError


def create_transcription_provider(config) -> TranscriptionProvider:
    if config.transcription_provider == "faster-whisper":
        return FasterWhisperProvider(config.transcription_model, config.device)
    raise ProviderNotFoundError(
        f"Unsupported transcription provider: {config.transcription_provider}"
    )


def create_translation_provider(config) -> TranslationProvider:
    return TranslatorProviderAdapter(
        provider_name=config.translator,
        source_lang=config.source_lang,
        target_lang=config.target_lang,
        api_key=config.api_key,
        model=config.translation_model,
    )


def create_tts_provider(config) -> TTSProvider:
    if config.tts_provider == "edge-tts":
        return EdgeTTSProvider(config.tts_model)
    raise ProviderNotFoundError(f"Unsupported TTS provider: {config.tts_provider}")
