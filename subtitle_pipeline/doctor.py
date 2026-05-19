import importlib.util
import os
import platform
import shutil
import sys
from dataclasses import dataclass
from typing import Callable, Literal

CheckStatus = Literal["pass", "warn", "fail"]


@dataclass(frozen=True)
class DoctorCheck:
    name: str
    status: CheckStatus
    message: str


PACKAGE_CHECKS = {
    "ffmpeg-python": "ffmpeg",
    "faster-whisper": "faster_whisper",
    "transformers": "transformers",
    "torch": "torch",
    "sentencepiece": "sentencepiece",
    "anthropic": "anthropic",
    "edge-tts": "edge_tts",
    "numpy": "numpy",
    "soundfile": "soundfile",
    "librosa": "librosa",
}


def run_doctor(
    *,
    which: Callable[[str], str | None] = shutil.which,
    find_spec: Callable[[str], object | None] = importlib.util.find_spec,
    environ: dict[str, str] | None = None,
) -> list[DoctorCheck]:
    env = environ if environ is not None else os.environ
    checks = [
        _check_python_version(),
        _check_ffmpeg_binary(which),
        *_check_python_packages(find_spec),
        _check_anthropic_key(env),
    ]
    return checks


def format_doctor_report(checks: list[DoctorCheck]) -> str:
    lines = ["CaptionFlow environment check", ""]
    for check in checks:
        lines.append(f"[{check.status.upper()}] {check.name}: {check.message}")
    return "\n".join(lines)


def doctor_exit_code(checks: list[DoctorCheck]) -> int:
    return 1 if any(check.status == "fail" for check in checks) else 0


def _check_python_version() -> DoctorCheck:
    version = sys.version_info
    current = platform.python_version()
    if version >= (3, 10):
        return DoctorCheck("Python", "pass", f"{current} is supported")
    return DoctorCheck("Python", "fail", f"{current} is unsupported; Python 3.10+ is required")


def _check_ffmpeg_binary(which: Callable[[str], str | None]) -> DoctorCheck:
    path = which("ffmpeg")
    if path:
        return DoctorCheck("ffmpeg executable", "pass", f"found at {path}")
    return DoctorCheck("ffmpeg executable", "fail", "not found in PATH")


def _check_python_packages(
    find_spec: Callable[[str], object | None],
) -> list[DoctorCheck]:
    checks = []
    for display_name, import_name in PACKAGE_CHECKS.items():
        if find_spec(import_name) is None:
            checks.append(
                DoctorCheck(
                    display_name,
                    "fail",
                    f"Python package '{import_name}' is not importable",
                )
            )
        else:
            checks.append(DoctorCheck(display_name, "pass", "importable"))
    return checks


def _check_anthropic_key(environ: dict[str, str]) -> DoctorCheck:
    if environ.get("ANTHROPIC_API_KEY"):
        return DoctorCheck("ANTHROPIC_API_KEY", "pass", "configured")
    return DoctorCheck(
        "ANTHROPIC_API_KEY",
        "warn",
        "not set; required only when using translator=claude between different languages",
    )
