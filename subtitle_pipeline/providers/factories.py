from .adapters import EdgeTTSProvider, FasterWhisperProvider, TranslatorProviderAdapter
from .contracts import TTSProvider, TranscriptionProvider, TranslationProvider


def create_transcription_provider(config) -> TranscriptionProvider:
    return FasterWhisperProvider(config.model_size, config.device)


def create_translation_provider(config) -> TranslationProvider:
    return TranslatorProviderAdapter(
        provider_name=config.translator,
        source_lang=config.source_lang,
        target_lang=config.target_lang,
        api_key=config.api_key,
    )


def create_tts_provider(config) -> TTSProvider:
    return EdgeTTSProvider()
