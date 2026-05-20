import os
import subprocess
import tempfile


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

    try:
        import ffmpeg
    except ModuleNotFoundError as exc:
        if exc.name != "ffmpeg":
            raise
        _extract_audio_with_ffmpeg_binary(video_path, output_path, sample_rate)
        return output_path

    (
        ffmpeg.input(video_path)
        .output(output_path, ac=1, ar=sample_rate, format="wav")
        .overwrite_output()
        .run(quiet=True)
    )

    return output_path


def _extract_audio_with_ffmpeg_binary(
    input_path: str,
    output_path: str,
    sample_rate: int,
) -> None:
    command = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        "-f",
        "wav",
        output_path,
    ]
    try:
        subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "ffmpeg executable was not found in PATH. Install ffmpeg or add it to PATH."
        ) from exc
    except subprocess.CalledProcessError as exc:
        details = (exc.stderr or exc.stdout or "").strip()
        if len(details) > 600:
            details = details[-600:]
        raise RuntimeError(f"ffmpeg failed to extract audio: {details}") from exc
