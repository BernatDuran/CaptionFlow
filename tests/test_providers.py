from subtitle_pipeline.models import Segment
from subtitle_pipeline.providers import (
    ProviderCapabilities,
    ProviderConfig,
    ProviderResultMetadata,
    TranslationResult,
)


class FakeTranslationProvider:
    config = ProviderConfig(name="fake", task="translation", model="fake-model")

    def capabilities(self):
        return ProviderCapabilities(
            name="fake",
            task="translation",
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
