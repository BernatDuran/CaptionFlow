from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

from .formatter import to_srt, to_txt, to_vtt, write_subtitles
from .models import Segment
from .providers import ProviderResultMetadata
from .subtitle_editor import validate_segments

SUPPORTED_EXPORT_PROFILES = {"legacy", "basic", "youtube", "review", "archive"}


@dataclass(frozen=True)
class ExportResult:
    files: list[str]
    manifest_path: str | None = None


def export_subtitles(
    segments: list[Segment],
    output_dir: str,
    base_name: str,
    *,
    profile: str,
    formats: list[str],
    source_lang: str,
    target_lang: str,
    use_translated: bool,
    provider_metadata: list[ProviderResultMetadata],
) -> ExportResult:
    if profile == "legacy":
        return ExportResult(
            write_subtitles(segments, output_dir, base_name, formats, use_translated)
        )
    if profile not in SUPPORTED_EXPORT_PROFILES:
        raise ValueError(f"Unknown export profile: {profile}")

    job_dir = Path(output_dir) / _safe_name(base_name)
    subtitle_dir = job_dir / "subtitles"
    review_dir = job_dir / "review"
    metadata_dir = job_dir / "metadata"
    subtitle_dir.mkdir(parents=True, exist_ok=True)
    metadata_dir.mkdir(parents=True, exist_ok=True)

    files: list[str] = []
    subtitle_formats = _formats_for_profile(profile, formats)
    for fmt in subtitle_formats:
        path = subtitle_dir / f"{base_name}.{target_lang}.{fmt}"
        _write_text(path, _format_segments(fmt, segments, use_translated))
        files.append(str(path))

    if profile in {"review", "archive"}:
        review_dir.mkdir(parents=True, exist_ok=True)
        bilingual_path = review_dir / f"{base_name}.{source_lang}-{target_lang}.bilingual.txt"
        _write_text(bilingual_path, to_bilingual_txt(segments))
        files.append(str(bilingual_path))

    manifest_path = metadata_dir / "export_manifest.json"
    _write_manifest(
        manifest_path,
        profile=profile,
        base_name=base_name,
        source_lang=source_lang,
        target_lang=target_lang,
        use_translated=use_translated,
        files=files,
        provider_metadata=provider_metadata,
        validation_issue_count=len(validate_segments(segments)),
    )
    files.append(str(manifest_path))
    return ExportResult(files=files, manifest_path=str(manifest_path))


def to_bilingual_txt(segments: list[Segment]) -> str:
    blocks = []
    for index, segment in enumerate(segments, 1):
        translated = segment.translated or segment.text
        blocks.append(
            "\n".join(
                [
                    f"[{index}] {segment.start:.3f} --> {segment.end:.3f}",
                    f"ORIGINAL: {segment.text}",
                    f"TRANSLATED: {translated}",
                ]
            )
        )
    return "\n\n".join(blocks)


def _formats_for_profile(profile: str, formats: list[str]) -> list[str]:
    if profile == "youtube":
        return ["srt", "vtt"]
    if profile == "review":
        return ["txt"]
    return formats


def _format_segments(fmt: str, segments: list[Segment], use_translated: bool) -> str:
    if fmt == "srt":
        return to_srt(segments, use_translated)
    if fmt == "vtt":
        return to_vtt(segments, use_translated)
    if fmt == "txt":
        return to_txt(segments, use_translated)
    raise ValueError(f"Unknown subtitle format: {fmt}")


def _write_manifest(
    path: Path,
    *,
    profile: str,
    base_name: str,
    source_lang: str,
    target_lang: str,
    use_translated: bool,
    files: list[str],
    provider_metadata: list[ProviderResultMetadata],
    validation_issue_count: int,
) -> None:
    payload = {
        "version": 1,
        "created_at": datetime.now(UTC).isoformat(),
        "profile": profile,
        "base_name": base_name,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "use_translated": use_translated,
        "files": files,
        "validation_issue_count": validation_issue_count,
        "providers": [asdict(metadata) for metadata in provider_metadata],
    }
    _write_text(path, json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _safe_name(name: str) -> str:
    safe = "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in name)
    return safe.strip("_")
