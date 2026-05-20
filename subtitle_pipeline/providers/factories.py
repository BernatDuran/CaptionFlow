from .adapters import (
    EdgeTTSProvider,
    FasterWhisperProvider,
    TranslatorProviderAdapter,
    default_translation_model,
)
from .contracts import ProviderConfig, TTSProvider, TranscriptionProvider, TranslationProvider
from .openai_compatible import (
    OpenAICompatibleTranslationProvider,
    default_openai_compatible_translation_model,
)
from .registry import get_provider_capabilities
from ..errors import ProviderNotFoundError


def create_transcription_provider(config) -> TranscriptionProvider:
    if config.transcription_provider == "faster-whisper":
        return FasterWhisperProvider(config.transcription_model, config.device)
    raise ProviderNotFoundError(
        f"Unsupported transcription provider: {config.transcription_provider}"
    )


def create_translation_provider(config) -> TranslationProvider:
    provider_config = build_translation_provider_config(
        config.translation_provider,
        config.translation_model,
    )
    return create_translation_provider_from_config(
        provider_config,
        source_lang=config.source_lang,
        target_lang=config.target_lang,
        api_key=config.api_key,
    )


def build_translation_provider_config(
    provider_name: str,
    model: str | None = None,
) -> ProviderConfig:
    capabilities = get_provider_capabilities(provider_name)
    default_model = _default_translation_model(provider_name)
    return ProviderConfig(
        name=provider_name,
        task="translation",
        model=model or default_model,
        api_key_env_var=capabilities.api_key_env_var,
        base_url=capabilities.base_url,
    )


def create_translation_provider_from_config(
    provider_config: ProviderConfig,
    *,
    source_lang: str,
    target_lang: str,
    api_key: str | None = None,
) -> TranslationProvider:
    if provider_config.name in {"nano-gpt", "openai"}:
        return OpenAICompatibleTranslationProvider(
            provider_name=provider_config.name,
            source_lang=source_lang,
            target_lang=target_lang,
            api_key=api_key,
            model=provider_config.model,
        )
    if provider_config.name in {"claude", "nllb"}:
        return TranslatorProviderAdapter(
            provider_name=provider_config.name,
            source_lang=source_lang,
            target_lang=target_lang,
            api_key=api_key,
            model=provider_config.model,
        )
    raise ProviderNotFoundError(
        f"Translation provider '{provider_config.name}' is registered "
        "but does not have a runtime adapter yet."
    )


def create_tts_provider(config) -> TTSProvider:
    if config.tts_provider == "edge-tts":
        return EdgeTTSProvider(config.tts_model)
    raise ProviderNotFoundError(f"Unsupported TTS provider: {config.tts_provider}")


def _default_translation_model(provider_name: str) -> str:
    if provider_name in {"nano-gpt", "openai"}:
        return default_openai_compatible_translation_model(provider_name)
    return default_translation_model(provider_name)
