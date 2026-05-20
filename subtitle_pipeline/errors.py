class CaptionFlowError(Exception):
    """Base error for expected CaptionFlow failures."""


class ConfigError(CaptionFlowError, ValueError):
    """Raised when pipeline configuration is invalid before work starts."""


class ProviderError(CaptionFlowError):
    """Base error for provider registry and adapter failures."""


class ProviderNotFoundError(ProviderError, ValueError):
    """Raised when a provider name is not registered."""


class ProviderDependencyError(ProviderError):
    """Raised when a provider cannot run because a dependency is missing."""


class ProviderAuthError(ProviderError):
    """Raised when a provider cannot run because credentials are missing."""


class ProviderRuntimeError(ProviderError):
    """Raised when a provider fails during execution and fallback may apply."""


class TranscriptionError(CaptionFlowError):
    """Raised when transcription fails."""


class TranslationError(CaptionFlowError):
    """Raised when translation fails."""


class TTSError(CaptionFlowError):
    """Raised when text-to-speech generation fails."""


class ExportError(CaptionFlowError):
    """Raised when subtitle or media export fails."""


class SubtitleEditError(CaptionFlowError, ValueError):
    """Raised when a subtitle editing operation is invalid."""
