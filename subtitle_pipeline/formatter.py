import os

from .errors import ExportError
from .models import Segment
from .subtitle_editor import validate_segments


def _format_time_srt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_time_vtt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def to_srt(segments: list[Segment], use_translated: bool = True) -> str:
    lines = []
    for i, seg in enumerate(segments, 1):
        text = seg.translated if (use_translated and seg.translated) else seg.text
        lines.append(f"{i}")
        lines.append(f"{_format_time_srt(seg.start)} --> {_format_time_srt(seg.end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def to_vtt(segments: list[Segment], use_translated: bool = True) -> str:
    lines = ["WEBVTT", ""]
    for seg in segments:
        text = seg.translated if (use_translated and seg.translated) else seg.text
        lines.append(f"{_format_time_vtt(seg.start)} --> {_format_time_vtt(seg.end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def to_txt(segments: list[Segment], use_translated: bool = True) -> str:
    lines = []
    for seg in segments:
        text = seg.translated if (use_translated and seg.translated) else seg.text
        lines.append(text)
    return "\n".join(lines)


_FORMATTERS = {
    "srt": to_srt,
    "vtt": to_vtt,
    "txt": to_txt,
}


def write_subtitles(
    segments: list[Segment],
    output_dir: str,
    base_name: str,
    formats: list[str],
    use_translated: bool = True,
) -> list[str]:
    _raise_if_invalid_segments(segments)
    os.makedirs(output_dir, exist_ok=True)
    output_files = []
    for fmt in formats:
        formatter = _FORMATTERS.get(fmt)
        if formatter is None:
            raise ExportError(f"Unknown format: {fmt}. Supported: {list(_FORMATTERS)}")
        content = formatter(segments, use_translated)
        path = os.path.join(output_dir, f"{base_name}.{fmt}")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        output_files.append(path)
    return output_files


def _raise_if_invalid_segments(segments: list[Segment]) -> None:
    issues = validate_segments(segments)
    errors = [issue for issue in issues if issue.severity == "error"]
    if not errors:
        return

    summary = "; ".join(
        f"{issue.code} at segment {issue.index}" for issue in errors[:5]
    )
    if len(errors) > 5:
        summary = f"{summary}; {len(errors) - 5} more"
    raise ExportError(f"Cannot export invalid subtitle segments: {summary}")
