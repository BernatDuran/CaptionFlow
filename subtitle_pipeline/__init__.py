from .models import Segment, SubtitleConfig
from .providers import (
    ProviderCapabilities,
    ProviderAvailabilityCheck,
    ProviderConfig,
    ProviderResultMetadata,
    EdgeTTSProvider,
    FasterWhisperProvider,
    TTSProvider,
    TTSResult,
    TranscriptionProvider,
    TranscriptionResult,
    TranslatorProviderAdapter,
    TranslationProvider,
    TranslationResult,
    check_provider_availability,
    create_transcription_provider,
    create_translation_provider,
    create_tts_provider,
    get_provider_capabilities,
    list_provider_capabilities,
    list_provider_names,
)


def __getattr__(name: str):
    if name == "run_subtitle_pipeline":
        from .pipeline import run_subtitle_pipeline

        return run_subtitle_pipeline
    raise AttributeError(f"module 'subtitle_pipeline' has no attribute {name!r}")

__all__ = [
    "run_subtitle_pipeline",
    "Segment",
    "SubtitleConfig",
    "ProviderCapabilities",
    "ProviderAvailabilityCheck",
    "ProviderConfig",
    "ProviderResultMetadata",
    "EdgeTTSProvider",
    "FasterWhisperProvider",
    "TTSProvider",
    "TTSResult",
    "TranscriptionProvider",
    "TranscriptionResult",
    "TranslatorProviderAdapter",
    "TranslationProvider",
    "TranslationResult",
    "check_provider_availability",
    "create_transcription_provider",
    "create_translation_provider",
    "create_tts_provider",
    "get_provider_capabilities",
    "list_provider_capabilities",
    "list_provider_names",
]
