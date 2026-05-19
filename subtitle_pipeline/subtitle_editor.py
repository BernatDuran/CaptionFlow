from __future__ import annotations

import json
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Literal

from .errors import SubtitleEditError
from .models import Segment

SubtitleIssueSeverity = Literal["error", "warning"]

DRAFT_VERSION = 1


@dataclass(frozen=True)
class SubtitleValidationIssue:
    code: str
    message: str
    index: int | None = None
    severity: SubtitleIssueSeverity = "error"


def snapshot_segments(segments: list[Segment]) -> list[Segment]:
    return _copy_segments(segments)


def edit_segment_text(
    segments: list[Segment],
    index: int,
    *,
    text: str | None = None,
    translated: str | None = None,
) -> list[Segment]:
    new_segments = _copy_segments(segments)
    segment = new_segments[_require_index(new_segments, index)]
    updates: dict[str, str] = {}
    if text is not None:
        updates["text"] = text
    if translated is not None:
        updates["translated"] = translated
    if not updates:
        return new_segments
    new_segments[index] = replace(segment, **updates)
    return new_segments


def shift_segment_time(
    segments: list[Segment],
    index: int,
    *,
    start: float | None = None,
    end: float | None = None,
) -> list[Segment]:
    new_segments = _copy_segments(segments)
    segment = new_segments[_require_index(new_segments, index)]
    new_segments[index] = replace(
        segment,
        start=segment.start if start is None else float(start),
        end=segment.end if end is None else float(end),
    )
    return new_segments


def delete_segment(segments: list[Segment], index: int) -> list[Segment]:
    new_segments = _copy_segments(segments)
    del new_segments[_require_index(new_segments, index)]
    return new_segments


def merge_segments(
    segments: list[Segment],
    start_index: int,
    end_index: int,
    *,
    separator: str = " ",
) -> list[Segment]:
    if start_index >= end_index:
        raise SubtitleEditError("A merge operation requires at least two segments.")

    new_segments = _copy_segments(segments)
    _require_index(new_segments, start_index)
    _require_index(new_segments, end_index)

    selected = new_segments[start_index : end_index + 1]
    merged = Segment(
        start=selected[0].start,
        end=selected[-1].end,
        text=_join_text([segment.text for segment in selected], separator),
        translated=_join_text(
            [segment.translated for segment in selected], separator
        ),
    )
    return new_segments[:start_index] + [merged] + new_segments[end_index + 1 :]


def split_segment(
    segments: list[Segment],
    index: int,
    split_time: float,
    first_text: str,
    second_text: str,
    *,
    first_translated: str = "",
    second_translated: str = "",
) -> list[Segment]:
    new_segments = _copy_segments(segments)
    segment = new_segments[_require_index(new_segments, index)]
    split_at = float(split_time)

    if not segment.start < split_at < segment.end:
        raise SubtitleEditError("Split time must be inside the segment boundaries.")

    first = Segment(
        start=segment.start,
        end=split_at,
        text=first_text,
        translated=first_translated,
    )
    second = Segment(
        start=split_at,
        end=segment.end,
        text=second_text,
        translated=second_translated,
    )
    return new_segments[:index] + [first, second] + new_segments[index + 1 :]


def normalize_segment_order(segments: list[Segment]) -> list[Segment]:
    return sorted(_copy_segments(segments), key=lambda segment: (segment.start, segment.end))


def validate_segments(
    segments: list[Segment],
    *,
    min_duration: float = 0.1,
) -> list[SubtitleValidationIssue]:
    issues: list[SubtitleValidationIssue] = []
    previous: Segment | None = None

    for index, segment in enumerate(segments):
        if segment.start < 0:
            issues.append(
                SubtitleValidationIssue(
                    code="negative_start",
                    message="Segment start time cannot be negative.",
                    index=index,
                )
            )

        if segment.end <= segment.start:
            issues.append(
                SubtitleValidationIssue(
                    code="invalid_timing",
                    message="Segment end time must be greater than start time.",
                    index=index,
                )
            )
        elif segment.end - segment.start < min_duration:
            issues.append(
                SubtitleValidationIssue(
                    code="duration_too_short",
                    message="Segment duration is shorter than the minimum duration.",
                    index=index,
                )
            )

        if not segment.text.strip():
            issues.append(
                SubtitleValidationIssue(
                    code="empty_text",
                    message="Segment original text cannot be empty.",
                    index=index,
                )
            )

        if previous is not None:
            if segment.start < previous.start:
                issues.append(
                    SubtitleValidationIssue(
                        code="out_of_order",
                        message="Segment starts before the previous segment.",
                        index=index,
                    )
                )
            if segment.start < previous.end:
                issues.append(
                    SubtitleValidationIssue(
                        code="overlap",
                        message="Segment overlaps with the previous segment.",
                        index=index,
                    )
                )

        previous = segment

    return issues


def save_subtitle_draft(segments: list[Segment], path: str | Path) -> Path:
    draft_path = Path(path)
    draft_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": DRAFT_VERSION,
        "segments": [asdict(segment) for segment in segments],
    }
    draft_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )
    return draft_path


def load_subtitle_draft(path: str | Path) -> list[Segment]:
    draft_path = Path(path)
    payload = json.loads(draft_path.read_text(encoding="utf-8"))
    version = payload.get("version")
    if version != DRAFT_VERSION:
        raise SubtitleEditError(f"Unsupported subtitle draft version: {version!r}")

    raw_segments = payload.get("segments")
    if not isinstance(raw_segments, list):
        raise SubtitleEditError("Subtitle draft must contain a segments list.")

    return [_segment_from_mapping(raw_segment) for raw_segment in raw_segments]


def _copy_segments(segments: list[Segment]) -> list[Segment]:
    return [replace(segment) for segment in segments]


def _require_index(segments: list[Segment], index: int) -> int:
    if index < 0 or index >= len(segments):
        raise SubtitleEditError(f"Segment index out of range: {index}")
    return index


def _join_text(values: list[str], separator: str) -> str:
    return separator.join(value.strip() for value in values if value.strip())


def _segment_from_mapping(value: object) -> Segment:
    if not isinstance(value, dict):
        raise SubtitleEditError("Each subtitle draft segment must be an object.")

    try:
        return Segment(
            start=float(value["start"]),
            end=float(value["end"]),
            text=str(value["text"]),
            translated=str(value.get("translated", "")),
        )
    except KeyError as exc:
        raise SubtitleEditError(
            f"Subtitle draft segment is missing field: {exc.args[0]}"
        ) from exc
