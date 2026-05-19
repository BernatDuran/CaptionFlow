from pathlib import Path

from subtitle_pipeline.dubbing import run_dubbing_pipeline_detailed
from subtitle_pipeline.models import Segment, SubtitleConfig
from subtitle_pipeline.providers import ProviderConfig, ProviderResultMetadata, TTSResult


class FakeTTSProvider:
    config = ProviderConfig(name="fake-tts", task="tts", model="test")

    def synthesize_segments(self, segments, output_dir, voice, rate, use_translated=True):
        audio_path = Path(output_dir) / "seg_0000.wav"
        audio_path.parent.mkdir(parents=True, exist_ok=True)
        audio_path.write_bytes(b"fake")
        return TTSResult(
            audio_paths=[str(audio_path)],
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
            ),
        )


def test_run_dubbing_pipeline_detailed_emits_events(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    output_dir = tmp_path / "out"
    events = []

    monkeypatch.setattr(
        "subtitle_pipeline.dubbing._merge_segments_to_track",
        lambda segments, audio_paths, output_path: Path(output_path).write_bytes(b"audio"),
    )
    monkeypatch.setattr(
        "subtitle_pipeline.dubbing._replace_video_audio",
        lambda video_path, audio_path, output_path: Path(output_path).write_bytes(b"video"),
    )

    result = run_dubbing_pipeline_detailed(
        [Segment(start=0.0, end=1.0, text="hello", translated="hola")],
        SubtitleConfig(
            input_path=str(input_path),
            output_dir=str(output_dir),
            source_lang="en",
            target_lang="es",
        ),
        tts_provider=FakeTTSProvider(),
        event_sink=events.append,
    )

    assert result.output_video == str(output_dir / "video_dubbed.mp4")
    assert result.provider_metadata.provider == "fake-tts"
    assert [(event.stage, event.status) for event in events] == [
        ("dub", "started"),
        ("dub", "progress"),
        ("dub", "progress"),
        ("dub", "progress"),
        ("dub", "completed"),
    ]
    assert events[1].details == {"synthesized_count": 1}
