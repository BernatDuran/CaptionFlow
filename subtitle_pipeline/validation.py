import os

from .errors import ConfigError
from .glossary import load_translation_glossary
from .models import SubtitleConfig
from .providers import (
    get_provider_capabilities,
    list_provider_names,
)
from .export_profiles import SUPPORTED_EXPORT_PROFILES

SUPPORTED_DEVICES = {"auto", "cuda", "cpu"}
SUPPORTED_FORMATS = {"srt", "vtt", "txt"}
MIN_TTS_RATE = -100
MAX_TTS_RATE = 100


def validate_config(config: SubtitleConfig) -> None:
    if not os.path.isfile(config.input_path):
        raise ConfigError(f"Input file not found: {config.input_path}")

    if os.path.exists(config.output_dir) and not os.path.isdir(config.output_dir):
        raise ConfigError(f"Output path is not a directory: {config.output_dir}")

    if config.device not in SUPPORTED_DEVICES:
        raise ConfigError(
            f"Unsupported device '{config.device}'. Supported: {sorted(SUPPORTED_DEVICES)}"
        )

    _validate_provider_name(config.transcription_provider, "transcription")
    _validate_provider_name(config.translation_provider, "translation")
    if config.translation_fallback_provider is not None:
        _validate_provider_name(config.translation_fallback_provider, "translation")
    _validate_provider_name(config.tts_provider, "tts")

    unsupported_formats = sorted(set(config.formats) - SUPPORTED_FORMATS)
    if unsupported_formats:
        raise ConfigError(
            f"Unsupported subtitle format(s): {unsupported_formats}. "
            f"Supported: {sorted(SUPPORTED_FORMATS)}"
        )

    if not config.formats:
        raise ConfigError("At least one subtitle format is required.")

    if config.export_profile not in SUPPORTED_EXPORT_PROFILES:
        raise ConfigError(
            f"Unsupported export profile '{config.export_profile}'. "
            f"Supported: {sorted(SUPPORTED_EXPORT_PROFILES)}"
        )

    if not MIN_TTS_RATE <= config.tts_rate <= MAX_TTS_RATE:
        raise ConfigError(
            f"tts_rate must be between {MIN_TTS_RATE} and {MAX_TTS_RATE}; "
            f"got {config.tts_rate}"
        )

    load_translation_glossary(config.translation_glossary_path)

    _validate_transcription_provider(config)
    _validate_translation_provider(config)
    _validate_translation_fallback_provider(config)
    _validate_tts_provider(config)


def _validate_translation_provider(config: SubtitleConfig) -> None:
    if config.source_lang == config.target_lang:
        return

    capabilities = get_provider_capabilities(config.translation_provider)
    if config.source_lang not in capabilities.supported_languages:
        raise ConfigError(
            f"Source language '{config.source_lang}' is not supported by "
            f"translation provider '{config.translation_provider}'. "
            f"Supported: {sorted(capabilities.supported_languages)}"
        )
    if config.target_lang not in capabilities.supported_languages:
        raise ConfigError(
            f"Target language '{config.target_lang}' is not supported by "
            f"translation provider '{config.translation_provider}'. "
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
        raise ConfigError(
            f"API key required for translation provider "
            f"'{config.translation_provider}'. {key_hint}"
        )


def _validate_transcription_provider(config: SubtitleConfig) -> None:
    capabilities = get_provider_capabilities(config.transcription_provider)
    if capabilities.requires_api_key and not _has_provider_key(
        config,
        capabilities.api_key_env_var,
    ):
        key_hint = (
            f"Set {capabilities.api_key_env_var} env var or pass --api-key"
            if capabilities.api_key_env_var
            else "Configure the provider API key"
        )
        raise ConfigError(
            f"API key required for transcription provider "
            f"'{config.transcription_provider}'. {key_hint}"
        )


def _validate_translation_fallback_provider(config: SubtitleConfig) -> None:
    if config.source_lang == config.target_lang or config.translation_fallback_provider is None:
        return

    capabilities = get_provider_capabilities(config.translation_fallback_provider)
    if config.source_lang not in capabilities.supported_languages:
        raise ConfigError(
            f"Source language '{config.source_lang}' is not supported by "
            f"translation fallback provider '{config.translation_fallback_provider}'. "
            f"Supported: {sorted(capabilities.supported_languages)}"
        )
    if config.target_lang not in capabilities.supported_languages:
        raise ConfigError(
            f"Target language '{config.target_lang}' is not supported by "
            f"translation fallback provider '{config.translation_fallback_provider}'. "
            f"Supported: {sorted(capabilities.supported_languages)}"
        )


def _validate_tts_provider(config: SubtitleConfig) -> None:
    if not config.dub:
        return

    capabilities = get_provider_capabilities(config.tts_provider)
    if config.target_lang not in capabilities.supported_languages:
        raise ConfigError(
            f"Target language '{config.target_lang}' is not supported by "
            f"TTS provider '{config.tts_provider}'. "
            f"Supported: {sorted(capabilities.supported_languages)}"
        )


def _validate_provider_name(name: str, task: str) -> None:
    supported = list_provider_names(task=task)
    if name not in supported:
        raise ConfigError(f"Unsupported {task} provider '{name}'. Supported: {supported}")


def _has_provider_key(config: SubtitleConfig, env_var: str | None) -> bool:
    return bool(config.api_key or (env_var and os.environ.get(env_var)))
