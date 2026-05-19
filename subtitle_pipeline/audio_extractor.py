import os
import tempfile

import ffmpeg


def extract_audio(
    video_path: str,
    output_path: str | None = None,
    sample_rate: int = 16000,
) -> str:
    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Input file not found: {video_path}")

    if output_path is None:
        tmp_dir = tempfile.mkdtemp(prefix="subtitle_")
        base = os.path.splitext(os.path.basename(video_path))[0]
        output_path = os.path.join(tmp_dir, f"{base}.wav")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    (
        ffmpeg.input(video_path)
        .output(output_path, ac=1, ar=sample_rate, format="wav")
        .overwrite_output()
        .run(quiet=True)
    )

    return output_path
