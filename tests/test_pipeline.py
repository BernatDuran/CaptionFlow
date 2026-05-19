from subtitle_pipeline.models import Segment, SubtitleConfig
from subtitle_pipeline.pipeline import run_subtitle_pipeline
from subtitle_pipeline.providers import (
    ProviderConfig,
    ProviderResultMetadata,
    TranscriptionResult,
    TranslationResult,
)


class FakeTranscriptionProvider:
    config = ProviderConfig(name="fake-transcriber", task="transcription", model="test")

    def transcribe(self, audio_path, language):
        return TranscriptionResult(
            segments=[Segment(start=0.0, end=1.0, text=f"hello-{language}")],
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
            ),
        )


class FakeTranslationProvider:
    config = ProviderConfig(name="fake-translator", task="translation", model="test")

    def translate_segments(self, segments, source_lang, target_lang):
        translated = [
            Segment(
                start=segment.start,
                end=segment.end,
                text=segment.text,
                translated=f"hola-{target_lang}",
            )
            for segment in segments
        ]
        return TranslationResult(
            segments=translated,
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
            ),
        )


def test_run_subtitle_pipeline_uses_injected_providers(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    output_dir = tmp_path / "out"

    def fake_extract_audio(input_file, output_path):
        assert input_file == str(input_path)
        return output_path

    monkeypatch.setattr("subtitle_pipeline.pipeline.extract_audio", fake_extract_audio)

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(output_dir),
        source_lang="en",
        target_lang="es",
        translator="nllb",
    )

    output_files = run_subtitle_pipeline(
        config,
        transcription_provider=FakeTranscriptionProvider(),
        translation_provider=FakeTranslationProvider(),
    )

    assert output_files == [str(output_dir / "video.srt")]
    assert (output_dir / "video.srt").read_text(encoding="utf-8") == (
        "1\n00:00:00,000 --> 00:00:01,000\nhola-es\n"
    )


def test_run_subtitle_pipeline_skips_translation_for_same_language(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    output_dir = tmp_path / "out"

    monkeypatch.setattr(
        "subtitle_pipeline.pipeline.extract_audio",
        lambda input_file, output_path: output_path,
    )

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(output_dir),
        source_lang="es",
        target_lang="es",
    )

    output_files = run_subtitle_pipeline(
        config,
        transcription_provider=FakeTranscriptionProvider(),
    )

    assert output_files == [str(output_dir / "video.srt")]
    assert "hello-es" in (output_dir / "video.srt").read_text(encoding="utf-8")
