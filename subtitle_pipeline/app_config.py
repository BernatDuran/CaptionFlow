import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

CONFIG_VERSION = 1


@dataclass
class AppConfig:
    version: int = CONFIG_VERSION
    source_lang: str = "en"
    target_lang: str = "es"
    output_dir: str = "./output"
    model_size: str = "large-v3"
    device: str = "auto"
    formats: list[str] = field(default_factory=lambda: ["srt"])
    translator: str = "claude"
    tts_voice: str = "es-ES-AlvaroNeural"
    tts_rate: int = 0
    transcription_provider: str = "faster-whisper"
    transcription_model: str = "large-v3"
    translation_provider: str = "claude"
    translation_model: str | None = None
    tts_provider: str = "edge-tts"
    tts_model: str = "edge-tts"


def default_config_path(home: Path | None = None) -> Path:
    base = home or Path.home()
    return base / ".captionflow" / "config.json"


def load_app_config(path: str | Path | None = None) -> AppConfig:
    config_path = Path(path) if path is not None else default_config_path()
    if not config_path.exists():
        return AppConfig()

    with config_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"Invalid config file: {config_path}")
    return app_config_from_dict(data)


def save_app_config(config: AppConfig, path: str | Path | None = None) -> Path:
    config_path = Path(path) if path is not None else default_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w", encoding="utf-8") as file:
        json.dump(asdict(config), file, indent=2, sort_keys=True)
        file.write("\n")
    return config_path


def app_config_from_dict(data: dict[str, Any]) -> AppConfig:
    defaults = asdict(AppConfig())
    merged = {**defaults, **data}
    merged["version"] = CONFIG_VERSION
    merged["formats"] = _as_string_list(merged.get("formats"))
    return AppConfig(**{key: merged[key] for key in defaults})


def _as_string_list(value: Any) -> list[str]:
    if value is None:
        return ["srt"]
    if isinstance(value, str):
        return [value]
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        return value
    raise ValueError("Config field 'formats' must be a string or list of strings")
