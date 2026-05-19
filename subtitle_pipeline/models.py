from dataclasses import dataclass, field


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
