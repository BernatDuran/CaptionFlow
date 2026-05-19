from subtitle_pipeline.models import Segment
from subtitle_pipeline.errors import ProviderNotFoundError
from subtitle_pipeline.providers import (
    ProviderCapabilities,
    ProviderConfig,
    ProviderResultMetadata,
    TranslationResult,
    check_provider_availability,
    get_provider_capabilities,
    list_provider_capabilities,
    list_provider_names,
)


class FakeTranslationProvider:
    config = ProviderConfig(name="fake", task="translation", model="fake-model")

    def capabilities(self):
        return ProviderCapabilities(
            name="fake",
            task="translation",
            package=None,
            supports_local_execution=True,
            requires_network=False,
            requires_api_key=False,
            supported_languages={"en", "es"},
        )

    def translate_segments(self, segments, source_lang, target_lang):
        translated = [
            Segment(seg.start, seg.end, seg.text, translated=f"{seg.text}-{target_lang}")
            for seg in segments
        ]
        return TranslationResult(
            segments=translated,
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
            ),
        )


def test_translation_provider_contract_shape():
    provider = FakeTranslationProvider()
    segments = [Segment(start=0.0, end=1.0, text="hello")]

    result = provider.translate_segments(segments, "en", "es")

    assert result.segments[0].translated == "hello-es"
    assert result.metadata.provider == "fake"
    assert provider.capabilities().supported_languages == {"en", "es"}


def test_list_provider_capabilities_can_filter_by_task():
    translation_providers = list_provider_capabilities(task="translation")

    assert {provider.name for provider in translation_providers} == {"claude", "nllb"}


def test_list_provider_names_can_filter_by_task():
    assert list_provider_names(task="translation") == ["claude", "nllb"]


def test_get_provider_capabilities_returns_known_provider():
    capabilities = get_provider_capabilities("faster-whisper")

    assert capabilities.task == "transcription"
    assert capabilities.package == "faster_whisper"


def test_get_provider_capabilities_rejects_unknown_provider():
    try:
        get_provider_capabilities("unknown")
    except ProviderNotFoundError as exc:
        assert "Unknown provider" in str(exc)
    else:
        raise AssertionError("Expected ProviderNotFoundError")


def test_check_provider_availability_reports_missing_dependency_first():
    capabilities = get_provider_capabilities("claude")

    availability = check_provider_availability(
        capabilities,
        has_package=False,
        has_api_key=False,
    )

    assert availability.status == "missing_dependency"


def test_check_provider_availability_reports_missing_api_key():
    capabilities = get_provider_capabilities("claude")

    availability = check_provider_availability(
        capabilities,
        has_package=True,
        has_api_key=False,
    )

    assert availability.status == "missing_api_key"
    assert "ANTHROPIC_API_KEY" in availability.message


def test_check_provider_availability_reports_available_provider():
    capabilities = get_provider_capabilities("edge-tts")

    availability = check_provider_availability(
        capabilities,
        has_package=True,
        has_api_key=True,
    )

    assert availability.status == "available"
