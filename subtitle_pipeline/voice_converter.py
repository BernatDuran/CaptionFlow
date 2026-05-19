import os
import sys
import subprocess


def convert_voice_rvc(
    input_audio: str,
    output_audio: str,
    pth_path: str,
    index_path: str,
    applio_dir: str,
    pitch: int = 0,
    f0_method: str = "rmvpe",
    index_rate: float = 0.75,
    export_format: str = "WAV",
):
    """Convert audio voice using Applio RVC via subprocess."""
    os.makedirs(os.path.dirname(output_audio), exist_ok=True)

    script = f"""
import os, sys
os.chdir(r"{applio_dir}")
sys.path.insert(0, r"{applio_dir}")
from rvc.infer.infer import VoiceConverter

vc = VoiceConverter()
vc.convert_audio(
    audio_input_path=r"{input_audio}",
    audio_output_path=r"{output_audio}",
    model_path=r"{pth_path}",
    index_path=r"{index_path}",
    pitch={pitch},
    f0_method="{f0_method}",
    index_rate={index_rate},
    volume_envelope=1.0,
    protect=0.5,
    split_audio=True,
    f0_autotune=False,
    f0_autotune_strength=1.0,
    clean_audio=True,
    clean_strength=0.5,
    export_format="{export_format}",
    embedder_model="contentvec",
    sid=0,
)
"""
    # Use Applio's python (conda-style env or venv)
    applio_python = os.path.join(applio_dir, "env", "python.exe")
    if not os.path.isfile(applio_python):
        applio_python = os.path.join(applio_dir, "env", "Scripts", "python.exe")
    if not os.path.isfile(applio_python):
        applio_python = sys.executable

    result = subprocess.run(
        [applio_python, "-c", script],
        capture_output=True,
        text=True,
        cwd=applio_dir,
    )
    if result.returncode != 0:
        raise RuntimeError(f"RVC conversion failed: {result.stderr}")

    return output_audio


def convert_segments_rvc(
    input_paths: list[str | None],
    output_dir: str,
    pth_path: str,
    index_path: str,
    applio_dir: str,
    pitch: int = 0,
    f0_method: str = "rmvpe",
    index_rate: float = 0.75,
) -> list[str | None]:
    os.makedirs(output_dir, exist_ok=True)
    results = []
    for i, inp in enumerate(input_paths):
        if inp is None:
            results.append(None)
            continue
        out_path = os.path.join(output_dir, f"rvc_{i:04d}.wav")
        print(f"  RVC converting segment {i+1}/{len(input_paths)}...")
        convert_voice_rvc(
            inp, out_path, pth_path, index_path, applio_dir,
            pitch=pitch, f0_method=f0_method, index_rate=index_rate,
        )
        results.append(out_path)
    return results
