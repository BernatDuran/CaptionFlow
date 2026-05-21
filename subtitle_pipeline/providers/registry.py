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
        privacy_level="local",
        supported_output_formats={"segments"},
        notes="Local Whisper transcription through faster-whisper.",
    ),
    "nano-gpt-whisper": ProviderCapabilities(
        name="nano-gpt-whisper",
        task="transcription",
        package="openai",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        api_key_env_var="NANO_GPT_API_KEY",
        base_url="https://nano-gpt.com/api/v1",
        privacy_level="api_cloud",
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        supports_fallback=True,
        notes="API transcription through nano-gpt using an OpenAI-compatible endpoint.",
    ),
    "openai-whisper": ProviderCapabilities(
        name="openai-whisper",
        task="transcription",
        package="openai",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        api_key_env_var="OPENAI_API_KEY",
        privacy_level="api_cloud",
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        supports_fallback=True,
        notes="API transcription through OpenAI Whisper-compatible models.",
    ),
    "claude": ProviderCapabilities(
        name="claude",
        task="translation",
        package="anthropic",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        api_key_env_var="ANTHROPIC_API_KEY",
        privacy_level="api_cloud",
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        notes="Legacy remote translation through the Anthropic API.",
    ),
    "nano-gpt": ProviderCapabilities(
        name="nano-gpt",
        task="translation",
        package="openai",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        api_key_env_var="NANO_GPT_API_KEY",
        base_url="https://nano-gpt.com/api/v1",
        privacy_level="api_cloud",
        estimated_unit_cost=0.03,
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        supports_fallback=True,
        notes="Recommended v2 translation provider through nano-gpt/Qwen.",
    ),
    "openai": ProviderCapabilities(
        name="openai",
        task="translation",
        package="openai",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        api_key_env_var="OPENAI_API_KEY",
        privacy_level="api_cloud",
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        supports_fallback=True,
        notes="Fallback translation provider through OpenAI chat models.",
    ),
    "nllb": ProviderCapabilities(
        name="nllb",
        task="translation",
        package="transformers",
        supports_local_execution=True,
        requires_network=False,
        requires_api_key=False,
        privacy_level="local",
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        notes="Legacy optional local NLLB translation through transformers.",
    ),
    "gemini": ProviderCapabilities(
        name="gemini",
        task="translation",
        package="google.genai",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        api_key_env_var="GEMINI_API_KEY",
        privacy_level="api_cloud",
        supported_languages={"ar", "ca", "de", "en", "es", "fr", "it", "ja", "ko", "nl", "pt", "ru", "zh"},
        supported_output_formats={"segments"},
        supports_fallback=True,
        notes="Translation provider through Google Gemini API (google-genai SDK).",
    ),
    "edge-tts": ProviderCapabilities(
        name="edge-tts",
        task="tts",
        package="edge_tts",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=False,
        privacy_level="api_cloud",
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"audio"},
        notes="Remote speech synthesis through Edge-TTS.",
    ),
    "openai-tts": ProviderCapabilities(
        name="openai-tts",
        task="tts",
        package="openai",
        supports_local_execution=False,
        requires_network=True,
        requires_api_key=True,
        api_key_env_var="OPENAI_API_KEY",
        privacy_level="api_cloud",
        supported_languages={"ar", "de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"},
        supported_output_formats={"audio"},
        supports_fallback=True,
        notes="Fallback quality TTS provider through OpenAI TTS models.",
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
