from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .providers import ProviderResultMetadata


@dataclass
class Segment:
    start: float
    end: float
    text: str
    translated: str = ""


@dataclass
class SubtitleConfig:
    input_path: str
    output_dir: str
    source_lang: str = "en"
    target_lang: str = "es"
    transcription_provider: str = "faster-whisper"
    transcription_model: str | None = None
    transcription_fallback_provider: str | None = None
    transcription_fallback_model: str | None = None
    model_size: str = "large-v3"
    device: str = "auto"
    formats: list[str] = field(default_factory=lambda: ["srt"])
    export_profile: str = "legacy"
    burn_in: bool = False
    translation_provider: str = "claude"
    translation_model: str | None = None
    translation_fallback_provider: str | None = None
    translation_fallback_model: str | None = None
    translation_cache_enabled: bool = False
    translation_cache_dir: str | None = None
    translation_glossary_path: str | None = None
    translator: str = "claude"
    api_key: str | None = None
    # Dubbing options
    dub: bool = False
    tts_provider: str = "edge-tts"
    tts_model: str = "edge-tts"
    tts_voice: str = "es-ES-AlvaroNeural"
    tts_rate: int = 0

    def __post_init__(self) -> None:
        if self.transcription_model is None:
            self.transcription_model = self.model_size
        else:
            self.model_size = self.transcription_model

        if self.translator != "claude" and self.translation_provider == "claude":
            self.translation_provider = self.translator
        elif self.translation_provider != self.translator:
            self.translator = self.translation_provider


@dataclass
class PipelineResult:
    output_files: list[str]
    segments: list[Segment]
    provider_metadata: list[ProviderResultMetadata] = field(default_factory=list)
