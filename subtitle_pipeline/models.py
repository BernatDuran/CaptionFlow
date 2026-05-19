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
    model_size: str = "large-v3"
    device: str = "auto"
    formats: list[str] = field(default_factory=lambda: ["srt"])
    burn_in: bool = False
    translator: str = "claude"
    api_key: str | None = None
    # Dubbing options
    dub: bool = False
    tts_voice: str = "es-ES-AlvaroNeural"
    tts_rate: int = 0


@dataclass
class PipelineResult:
    output_files: list[str]
    segments: list[Segment]
    provider_metadata: list[ProviderResultMetadata] = field(default_factory=list)
