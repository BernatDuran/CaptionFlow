from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

from .models import Segment

ProviderTask = Literal["transcription", "translation", "tts"]


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
    supports_local_execution: bool
    requires_network: bool
    requires_api_key: bool
    supported_languages: set[str] = field(default_factory=set)
    supported_output_formats: set[str] = field(default_factory=set)
    notes: str = ""


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
