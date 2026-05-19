import importlib.util
import os
import platform
import shutil
import sys
from dataclasses import dataclass
from typing import Callable, Literal

from .providers import check_provider_availability, list_provider_capabilities

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
        *_check_ai_providers(find_spec, env),
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


def _check_ai_providers(
    find_spec: Callable[[str], object | None],
    environ: dict[str, str],
) -> list[DoctorCheck]:
    checks = []
    for capabilities in list_provider_capabilities():
        availability = check_provider_availability(
            capabilities,
            has_package=_has_package(capabilities.package, find_spec),
            has_api_key=_has_required_key(capabilities.name, environ),
        )
        checks.append(
            DoctorCheck(
                name=f"provider:{availability.task}:{availability.name}",
                status=_provider_status_to_doctor_status(availability.status),
                message=availability.message,
            )
        )
    return checks


def _has_package(
    package: str | None,
    find_spec: Callable[[str], object | None],
) -> bool:
    return package is None or find_spec(package) is not None


def _has_required_key(provider_name: str, environ: dict[str, str]) -> bool:
    for capabilities in list_provider_capabilities():
        if capabilities.name == provider_name:
            return not capabilities.requires_api_key or bool(
                capabilities.api_key_env_var
                and environ.get(capabilities.api_key_env_var)
            )
    return False


def _provider_status_to_doctor_status(status: str) -> CheckStatus:
    if status == "available":
        return "pass"
    if status == "missing_api_key":
        return "warn"
    return "fail"
