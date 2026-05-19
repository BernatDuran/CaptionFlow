import os
import subprocess
import numpy as np
import soundfile as sf

from .models import Segment


def get_audio_duration(path: str) -> float:
    info = sf.info(path)
    return info.duration


def adjust_speed(input_path: str, output_path: str, target_duration: float):
    """Adjust audio speed to fit target duration using ffmpeg atempo."""
    current_duration = get_audio_duration(input_path)
    if current_duration <= 0:
        return input_path

    ratio = current_duration / target_duration
    # atempo filter only accepts 0.5 to 100.0
    ratio = max(0.5, min(ratio, 100.0))

    subprocess.run(
        [
            "ffmpeg", "-i", input_path,
            "-filter:a", f"atempo={ratio}",
            "-y", output_path,
        ],
        capture_output=True,
        check=True,
    )
    return output_path


def merge_segments_to_track(
    segments: list[Segment],
    audio_paths: list[str | None],
    output_path: str,
    sample_rate: int = 24000,
) -> str:
    """Merge individual audio segments into a single track aligned to timestamps."""
    if not segments:
        raise ValueError("No segments to merge")

    total_duration = max(seg.end for seg in segments)
    total_samples = int(total_duration * sample_rate) + sample_rate  # +1s padding
    merged = np.zeros(total_samples, dtype=np.float32)

    for seg, audio_path in zip(segments, audio_paths):
        if audio_path is None or not os.path.isfile(audio_path):
            continue

        audio, sr = sf.read(audio_path, dtype="float32")
        if len(audio.shape) > 1:
            audio = audio.mean(axis=1)

        # Resample if needed
        if sr != sample_rate:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=sample_rate)

        seg_duration = seg.end - seg.start
        audio_duration = len(audio) / sample_rate

        # Speed up if audio is longer than the segment slot
        if audio_duration > seg_duration * 1.1:
            ratio = audio_duration / seg_duration
            ratio = max(0.5, min(ratio, 100.0))
            # Resample to speed up (simple approach)
            target_len = int(len(audio) / ratio)
            indices = np.linspace(0, len(audio) - 1, target_len).astype(int)
            audio = audio[indices]

        start_sample = int(seg.start * sample_rate)
        end_sample = start_sample + len(audio)

        if end_sample > len(merged):
            merged = np.pad(merged, (0, end_sample - len(merged)))

        merged[start_sample:end_sample] += audio

    # Normalize
    peak = np.abs(merged).max()
    if peak > 0:
        merged = merged / peak * 0.95

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, merged, sample_rate)
    return output_path


def replace_video_audio(video_path: str, audio_path: str, output_path: str) -> str:
    """Replace video audio track with new audio."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            "-y", output_path,
        ],
        capture_output=True,
        check=True,
    )
    return output_path
