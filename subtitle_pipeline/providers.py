from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

from .models import Segment

ProviderTask = Literal["transcription", "translation", "tts"]
ProviderAvailability = Literal["available", "missing_dependency", "missing_api_key"]


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    task: ProviderTask
    model: str
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ProviderCapabilities:
    name: str
    task: ProviderTask
    package: str | None
    supports_local_execution: bool
    requires_network: bool
    requires_api_key: bool
    supported_languages: set[str] = field(default_factory=set)
    supported_output_formats: set[str] = field(default_factory=set)
    notes: str = ""


@dataclass(frozen=True)
class ProviderAvailabilityCheck:
    name: str
    task: ProviderTask
    status: ProviderAvailability
    message: str


@dataclass(frozen=True)
class ProviderResultMetadata:
    provider: str
    model: str
    task: ProviderTask
    duration_seconds: float | None = None
    estimated_cost: float | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class TranscriptionResult:
    segments: list[Segment]
    metadata: ProviderResultMetadata


@dataclass(frozen=True)
class TranslationResult:
    segments: list[Segment]
    metadata: ProviderResultMetadata


@dataclass(frozen=True)
class TTSResult:
    audio_paths: list[str | None]
    metadata: ProviderResultMetadata


class TranscriptionProvider(Protocol):
    config: ProviderConfig

    def capabilities(self) -> ProviderCapabilities:
        ...

    def transcribe(self, audio_path: str, language: str) -> TranscriptionResult:
        ...


class TranslationProvider(Protocol):
    config: ProviderConfig

    def capabilities(self) -> ProviderCapabilities:
        ...

    def translate_segments(
        self,
        segments: list[Segment],
        source_lang: str,
        target_lang: str,
    ) -> TranslationResult:
        ...


class TTSProvider(Protocol):
    config: ProviderConfig

    def capabilities(self) -> ProviderCapabilities:
        ...

    def synthesize_segments(
        self,
        segments: list[Segment],
        output_dir: str,
        voice: str,
        rate: int,
        use_translated: bool = True,
    ) -> TTSResult:
        ...


INITIAL_PROVIDER_CAPABILITIES = {
    "faster-whisper": ProviderCapabilities(
        name="faster-whisper",
        task="transcription",
        package="faster_whisper",
        supports_local_execution=True,
        requires_network=False,
        requires_api_key=False,
        supported_output_formats={"segments"},
        notes="Local Whisper transcription through faster-whisper.",
    ),
    "claude": ProviderCapabilities(
        name="claude",
        task="translation",
        package="anthropic",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        notes="Remote translation through the Anthropic API.",
    ),
    "nllb": ProviderCapabilities(
        name="nllb",
        task="translation",
        package="transformers",
        supports_local_execution=True,
        requires_network=False,
        requires_api_key=False,
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        notes="Local NLLB translation through transformers.",
    ),
    "edge-tts": ProviderCapabilities(
        name="edge-tts",
        task="tts",
        package="edge_tts",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=False,
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"audio"},
        notes="Remote speech synthesis through Edge-TTS.",
    ),
}


def list_provider_capabilities(task: ProviderTask | None = None) -> list[ProviderCapabilities]:
    providers = list(INITIAL_PROVIDER_CAPABILITIES.values())
    if task is None:
        return providers
    return [provider for provider in providers if provider.task == task]


def get_provider_capabilities(name: str) -> ProviderCapabilities:
    try:
        return INITIAL_PROVIDER_CAPABILITIES[name]
    except KeyError as exc:
        raise ValueError(f"Unknown provider: {name}") from exc


def check_provider_availability(
    capabilities: ProviderCapabilities,
    *,
    has_package: bool,
    has_api_key: bool,
) -> ProviderAvailabilityCheck:
    if capabilities.package and not has_package:
        return ProviderAvailabilityCheck(
            name=capabilities.name,
            task=capabilities.task,
            status="missing_dependency",
            message=f"Python package '{capabilities.package}' is not importable",
        )
    if capabilities.requires_api_key and not has_api_key:
        return ProviderAvailabilityCheck(
            name=capabilities.name,
            task=capabilities.task,
            status="missing_api_key",
            message="required API key is not configured",
        )
    return ProviderAvailabilityCheck(
        name=capabilities.name,
        task=capabilities.task,
        status="available",
        message="available",
    )
