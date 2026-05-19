from .contracts import (
    ProviderAvailabilityCheck,
    ProviderCapabilities,
    ProviderTask,
)
from ..errors import ProviderNotFoundError

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
        api_key_env_var="ANTHROPIC_API_KEY",
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


def list_provider_names(task: ProviderTask | None = None) -> list[str]:
    return sorted(provider.name for provider in list_provider_capabilities(task))


def get_provider_capabilities(name: str) -> ProviderCapabilities:
    try:
        return INITIAL_PROVIDER_CAPABILITIES[name]
    except KeyError as exc:
        raise ProviderNotFoundError(f"Unknown provider: {name}") from exc


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
        key_hint = f" Set {capabilities.api_key_env_var}." if capabilities.api_key_env_var else ""
        return ProviderAvailabilityCheck(
            name=capabilities.name,
            task=capabilities.task,
            status="missing_api_key",
            message=f"required API key is not configured.{key_hint}",
        )
    return ProviderAvailabilityCheck(
        name=capabilities.name,
        task=capabilities.task,
        status="available",
        message="available",
    )
