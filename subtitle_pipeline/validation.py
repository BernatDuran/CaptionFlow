import os

from .models import SubtitleConfig

SUPPORTED_DEVICES = {"auto", "cuda", "cpu"}
SUPPORTED_FORMATS = {"srt", "vtt", "txt"}
SUPPORTED_TRANSLATORS = {"claude", "nllb"}
MIN_TTS_RATE = -100
MAX_TTS_RATE = 100


class ConfigError(ValueError):
    """Raised when pipeline configuration is invalid before work starts."""


def validate_config(config: SubtitleConfig) -> None:
    if not os.path.isfile(config.input_path):
        raise ConfigError(f"Input file not found: {config.input_path}")

    if os.path.exists(config.output_dir) and not os.path.isdir(config.output_dir):
        raise ConfigError(f"Output path is not a directory: {config.output_dir}")

    if config.device not in SUPPORTED_DEVICES:
        raise ConfigError(
            f"Unsupported device '{config.device}'. Supported: {sorted(SUPPORTED_DEVICES)}"
        )

    if config.translator not in SUPPORTED_TRANSLATORS:
        raise ConfigError(
            f"Unsupported translator '{config.translator}'. "
            f"Supported: {sorted(SUPPORTED_TRANSLATORS)}"
        )

    unsupported_formats = sorted(set(config.formats) - SUPPORTED_FORMATS)
    if unsupported_formats:
        raise ConfigError(
            f"Unsupported subtitle format(s): {unsupported_formats}. "
            f"Supported: {sorted(SUPPORTED_FORMATS)}"
        )

    if not config.formats:
        raise ConfigError("At least one subtitle format is required.")

    if not MIN_TTS_RATE <= config.tts_rate <= MAX_TTS_RATE:
        raise ConfigError(
            f"tts_rate must be between {MIN_TTS_RATE} and {MAX_TTS_RATE}; "
            f"got {config.tts_rate}"
        )

    if _requires_claude_key(config) and not _has_claude_key(config):
        raise ConfigError(
            "Claude API key required. Set ANTHROPIC_API_KEY env var or pass --api-key"
        )


def _requires_claude_key(config: SubtitleConfig) -> bool:
    return config.source_lang != config.target_lang and config.translator == "claude"


def _has_claude_key(config: SubtitleConfig) -> bool:
    return bool(config.api_key or os.environ.get("ANTHROPIC_API_KEY"))
