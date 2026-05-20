import json

from subtitle_pipeline.export_profiles import export_subtitles, to_bilingual_txt
from subtitle_pipeline.models import Segment
from subtitle_pipeline.providers import ProviderResultMetadata


def _segments():
    return [Segment(start=0.0, end=1.0, text="Hello", translated="Hola")]


def _metadata():
    return [
        ProviderResultMetadata(
            provider="openai",
            model="gpt-test",
            task="translation",
            cache_hit=True,
        )
    ]


def test_youtube_export_profile_writes_srt_vtt_and_manifest(tmp_path):
    result = export_subtitles(
        _segments(),
        str(tmp_path),
        "my video",
        profile="youtube",
        formats=["txt"],
        source_lang="en",
        target_lang="es",
        use_translated=True,
        provider_metadata=_metadata(),
    )

    files = {path.replace("\\", "/") for path in result.files}

    assert any(path.endswith("/my_video/subtitles/my video.es.srt") for path in files)
    assert any(path.endswith("/my_video/subtitles/my video.es.vtt") for path in files)
    assert any(path.endswith("/my_video/metadata/export_manifest.json") for path in files)
    manifest = json.loads((tmp_path / "my_video" / "metadata" / "export_manifest.json").read_text())
    assert manifest["profile"] == "youtube"
    assert manifest["providers"][0]["cache_hit"] is True


def test_review_export_profile_writes_bilingual_review_file(tmp_path):
    result = export_subtitles(
        _segments(),
        str(tmp_path),
        "video",
        profile="review",
        formats=["srt"],
        source_lang="en",
        target_lang="es",
        use_translated=True,
        provider_metadata=[],
    )

    assert any(path.endswith("video.en-es.bilingual.txt") for path in result.files)
    review_text = (tmp_path / "video" / "review" / "video.en-es.bilingual.txt").read_text()
    assert "ORIGINAL: Hello" in review_text


def test_to_bilingual_txt_includes_original_and_translation():
    assert to_bilingual_txt(_segments()) == (
        "[1] 0.000 --> 1.000\nORIGINAL: Hello\nTRANSLATED: Hola"
    )
