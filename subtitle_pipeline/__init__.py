from .models import Segment, SubtitleConfig
from .providers import (
    ProviderCapabilities,
    ProviderAvailabilityCheck,
    ProviderConfig,
    ProviderResultMetadata,
    TTSProvider,
    TTSResult,
    TranscriptionProvider,
    TranscriptionResult,
    TranslationProvider,
    TranslationResult,
    check_provider_availability,
    get_provider_capabilities,
    list_provider_capabilities,
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
    "TTSProvider",
    "TTSResult",
    "TranscriptionProvider",
    "TranscriptionResult",
    "TranslationProvider",
    "TranslationResult",
    "check_provider_availability",
    "get_provider_capabilities",
    "list_provider_capabilities",
]
