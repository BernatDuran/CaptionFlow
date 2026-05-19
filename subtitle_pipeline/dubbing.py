import os
import shutil
import tempfile

from .models import Segment, SubtitleConfig
from .tts import synthesize_segments
from .voice_converter import convert_segments_rvc
from .audio_mixer import merge_segments_to_track, replace_video_audio


def run_dubbing_pipeline(
    segments: list[Segment],
    config: SubtitleConfig,
) -> str:
    """Generate dubbed video from translated segments."""
    base_name = os.path.splitext(os.path.basename(config.input_path))[0]
    tmp_dir = tempfile.mkdtemp(prefix="dubbing_")

    try:
        tts_dir = os.path.join(tmp_dir, "tts")
        rvc_dir = os.path.join(tmp_dir, "rvc")

        # 1. TTS: generate Spanish audio for each segment
        print(f"Generating TTS audio ({config.tts_voice})...")
        tts_paths = synthesize_segments(
            segments, tts_dir,
            voice=config.tts_voice,
            rate=config.tts_rate,
            use_translated=config.source_lang != config.target_lang,
        )
        print(f"  {sum(1 for p in tts_paths if p)} segments synthesized.")

        # 2. RVC: convert voice (if model provided)
        if config.rvc_model_path:
            print(f"Converting voice with RVC...")
            audio_paths = convert_segments_rvc(
                tts_paths, rvc_dir,
                pth_path=config.rvc_model_path,
                index_path=config.rvc_index_path or "",
                applio_dir=config.applio_dir or "",
                pitch=config.rvc_pitch,
                f0_method=config.rvc_f0_method,
            )
            print(f"  Voice conversion complete.")
        else:
            audio_paths = tts_paths

        # 3. Merge segments into single audio track
        print("Merging audio segments...")
        merged_audio = os.path.join(tmp_dir, "merged.wav")
        merge_segments_to_track(segments, audio_paths, merged_audio)

        # 4. Replace video audio
        output_video = os.path.join(config.output_dir, f"{base_name}_dubbed.mp4")
        os.makedirs(config.output_dir, exist_ok=True)
        print("Replacing video audio...")
        replace_video_audio(config.input_path, merged_audio, output_video)
        print(f"  Created: {output_video}")

        return output_video

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
