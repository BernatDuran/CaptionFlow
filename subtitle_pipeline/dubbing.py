import os
import shutil
import tempfile
from dataclasses import dataclass

from .models import Segment, SubtitleConfig
from .progress import EventSink, emit_event
from .providers import ProviderResultMetadata, TTSProvider, create_tts_provider


def run_dubbing_pipeline(
    segments: list[Segment],
    config: SubtitleConfig,
    tts_provider: TTSProvider | None = None,
    event_sink: EventSink | None = None,
) -> str:
    result = run_dubbing_pipeline_detailed(segments, config, tts_provider, event_sink)
    return result.output_video


@dataclass
class DubbingResult:
    output_video: str
    provider_metadata: ProviderResultMetadata


def run_dubbing_pipeline_detailed(
    segments: list[Segment],
    config: SubtitleConfig,
    tts_provider: TTSProvider | None = None,
    event_sink: EventSink | None = None,
) -> DubbingResult:
    """Generate dubbed video from translated segments."""
    base_name = os.path.splitext(os.path.basename(config.input_path))[0]
    tmp_dir = tempfile.mkdtemp(prefix="dubbing_")
    tts_provider = tts_provider or create_tts_provider(config)

    try:
        tts_dir = os.path.join(tmp_dir, "tts")
        # 1. TTS: generate Spanish audio for each segment
        emit_event(
            event_sink,
            "dub",
            "started",
            f"Generating TTS audio ({tts_provider.config.name}/{config.tts_voice})...",
            details={
                "provider": tts_provider.config.name,
                "voice": config.tts_voice,
            },
        )
        tts_result = tts_provider.synthesize_segments(
            segments,
            tts_dir,
            voice=config.tts_voice,
            rate=config.tts_rate,
            use_translated=config.source_lang != config.target_lang,
        )
        audio_paths = tts_result.audio_paths
        emit_event(
            event_sink,
            "dub",
            "progress",
            f"  {sum(1 for p in audio_paths if p)} segments synthesized.",
            details={"synthesized_count": sum(1 for path in audio_paths if path)},
        )

        # 2. Merge segments into single audio track
        emit_event(event_sink, "dub", "progress", "Merging audio segments...")
        merged_audio = os.path.join(tmp_dir, "merged.wav")
        _merge_segments_to_track(segments, audio_paths, merged_audio)

        # 3. Replace video audio
        output_video = os.path.join(config.output_dir, f"{base_name}_dubbed.mp4")
        os.makedirs(config.output_dir, exist_ok=True)
        emit_event(event_sink, "dub", "progress", "Replacing video audio...")
        _replace_video_audio(config.input_path, merged_audio, output_video)
        emit_event(
            event_sink,
            "dub",
            "completed",
            f"  Created: {output_video}",
            details={"output_file": output_video},
        )

        return DubbingResult(output_video, tts_result.metadata)

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _merge_segments_to_track(
    segments: list[Segment],
    audio_paths: list[str | None],
    output_path: str,
) -> str:
    from .audio_mixer import merge_segments_to_track

    return merge_segments_to_track(segments, audio_paths, output_path)


def _replace_video_audio(video_path: str, audio_path: str, output_path: str) -> str:
    from .audio_mixer import replace_video_audio

    return replace_video_audio(video_path, audio_path, output_path)
