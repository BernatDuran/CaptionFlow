import os
import shutil
import tempfile

from .models import Segment, SubtitleConfig
from .audio_mixer import merge_segments_to_track, replace_video_audio
from .providers import TTSProvider, create_tts_provider


def run_dubbing_pipeline(
    segments: list[Segment],
    config: SubtitleConfig,
    tts_provider: TTSProvider | None = None,
) -> str:
    """Generate dubbed video from translated segments."""
    base_name = os.path.splitext(os.path.basename(config.input_path))[0]
    tmp_dir = tempfile.mkdtemp(prefix="dubbing_")
    tts_provider = tts_provider or create_tts_provider(config)

    try:
        tts_dir = os.path.join(tmp_dir, "tts")
        # 1. TTS: generate Spanish audio for each segment
        print(f"Generating TTS audio ({tts_provider.config.name}/{config.tts_voice})...")
        tts_result = tts_provider.synthesize_segments(
            segments,
            tts_dir,
            voice=config.tts_voice,
            rate=config.tts_rate,
            use_translated=config.source_lang != config.target_lang,
        )
        audio_paths = tts_result.audio_paths
        print(f"  {sum(1 for p in audio_paths if p)} segments synthesized.")

        # 2. Merge segments into single audio track
        print("Merging audio segments...")
        merged_audio = os.path.join(tmp_dir, "merged.wav")
        merge_segments_to_track(segments, audio_paths, merged_audio)

        # 3. Replace video audio
        output_video = os.path.join(config.output_dir, f"{base_name}_dubbed.mp4")
        os.makedirs(config.output_dir, exist_ok=True)
        print("Replacing video audio...")
        replace_video_audio(config.input_path, merged_audio, output_video)
        print(f"  Created: {output_video}")

        return output_video

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
