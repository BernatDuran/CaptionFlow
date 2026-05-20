from subtitle_pipeline.cache import TranslationCache, build_translation_cache_key
from subtitle_pipeline.models import Segment
from subtitle_pipeline.providers import ProviderConfig


def test_translation_cache_round_trips_segments(tmp_path):
    cache = TranslationCache(tmp_path)
    provider_config = ProviderConfig(name="openai", task="translation", model="gpt-test")
    source_segments = [Segment(start=0.0, end=1.0, text="hello")]
    translated_segments = [Segment(start=0.0, end=1.0, text="hello", translated="hola")]
    key = build_translation_cache_key(
        provider_config,
        source_lang="en",
        target_lang="es",
        segments=source_segments,
    )

    cache.set(key, translated_segments)

    assert cache.get(key) == translated_segments


def test_translation_cache_ignores_corrupt_entries(tmp_path):
    cache = TranslationCache(tmp_path)
    key = "broken"
    (tmp_path / f"{key}.json").write_text("{not-json", encoding="utf-8")

    assert cache.get(key) is None
