import os

from .models import SubtitleConfig
from .providers import (
    get_provider_capabilities,
    list_provider_names,
)

SUPPORTED_DEVICES = {"auto", "cuda", "cpu"}
SUPPORTED_FORMATS = {"srt", "vtt", "txt"}
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

    supported_translators = list_provider_names(task="translation")
    if config.translator not in supported_translators:
        raise ConfigError(
            f"Unsupported translator '{config.translator}'. "
            f"Supported: {supported_translators}"
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

    _validate_translation_provider(config)

def _validate_translation_provider(config: SubtitleConfig) -> None:
    if config.source_lang == config.target_lang:
        return

    capabilities = get_provider_capabilities(config.translator)
    if config.source_lang not in capabilities.supported_languages:
        raise ConfigError(
            f"Source language '{config.source_lang}' is not supported by "
            f"translator '{config.translator}'. "
            f"Supported: {sorted(capabilities.supported_languages)}"
        )
    if config.target_lang not in capabilities.supported_languages:
        raise ConfigError(
            f"Target language '{config.target_lang}' is not supported by "
            f"translator '{config.translator}'. "
            f"Supported: {sorted(capabilities.supported_languages)}"
        )
    if capabilities.requires_api_key and not _has_provider_key(
        config,
        capabilities.api_key_env_var,
    ):
        key_hint = (
            f"Set {capabilities.api_key_env_var} env var or pass --api-key"
            if capabilities.api_key_env_var
            else "Configure the provider API key"
        )
        raise ConfigError(f"API key required for translator '{config.translator}'. {key_hint}")


def _has_provider_key(config: SubtitleConfig, env_var: str | None) -> bool:
    return bool(config.api_key or (env_var and os.environ.get(env_var)))
