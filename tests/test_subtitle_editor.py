import json

import pytest

from subtitle_pipeline.errors import SubtitleEditError
from subtitle_pipeline.models import Segment
from subtitle_pipeline.subtitle_editor import (
    delete_segment,
    edit_segment_text,
    load_subtitle_draft,
    merge_segments,
    normalize_segment_order,
    save_subtitle_draft,
    shift_segment_time,
    snapshot_segments,
    split_segment,
    validate_segments,
)


def _segments() -> list[Segment]:
    return [
        Segment(start=0.0, end=1.0, text="Hello", translated="Hola"),
        Segment(start=1.5, end=2.0, text="World", translated="Mundo"),
    ]


def test_edit_segment_text_returns_new_segments_without_mutating_source():
    segments = _segments()

    edited = edit_segment_text(segments, 0, text="Hello there")

    assert edited[0].text == "Hello there"
    assert segments[0].text == "Hello"
    assert edited is not segments


def test_shift_segment_time_updates_selected_segment_only():
    shifted = shift_segment_time(_segments(), 1, start=1.25, end=2.25)

    assert shifted[0] == Segment(start=0.0, end=1.0, text="Hello", translated="Hola")
    assert shifted[1].start == 1.25
    assert shifted[1].end == 2.25


def test_delete_segment_removes_selected_segment():
    remaining = delete_segment(_segments(), 0)

    assert remaining == [Segment(start=1.5, end=2.0, text="World", translated="Mundo")]


def test_merge_segments_joins_time_bounds_and_text():
    merged = merge_segments(_segments(), 0, 1)

    assert merged == [
        Segment(
            start=0.0,
            end=2.0,
            text="Hello World",
            translated="Hola Mundo",
        )
    ]


def test_split_segment_replaces_segment_with_two_parts():
    split = split_segment(
        _segments(),
        0,
        0.4,
        "Hel",
        "lo",
        first_translated="Ho",
        second_translated="la",
    )

    assert split == [
        Segment(start=0.0, end=0.4, text="Hel", translated="Ho"),
        Segment(start=0.4, end=1.0, text="lo", translated="la"),
        Segment(start=1.5, end=2.0, text="World", translated="Mundo"),
    ]


def test_split_segment_rejects_boundary_time():
    with pytest.raises(SubtitleEditError, match="inside the segment"):
        split_segment(_segments(), 0, 1.0, "Hello", "")


def test_validate_segments_detects_temporal_and_text_issues():
    segments = [
        Segment(start=-0.1, end=0.05, text=""),
        Segment(start=0.04, end=0.08, text="Short"),
        Segment(start=0.03, end=1.0, text="Earlier"),
        Segment(start=1.0, end=1.0, text="Invalid"),
    ]

    codes = [issue.code for issue in validate_segments(segments, min_duration=0.1)]

    assert codes == [
        "negative_start",
        "empty_text",
        "duration_too_short",
        "overlap",
        "out_of_order",
        "overlap",
        "invalid_timing",
    ]


def test_normalize_segment_order_sorts_without_mutating_source():
    segments = [
        Segment(start=2.0, end=3.0, text="Second"),
        Segment(start=0.0, end=1.0, text="First"),
    ]

    ordered = normalize_segment_order(segments)

    assert [segment.text for segment in ordered] == ["First", "Second"]
    assert [segment.text for segment in segments] == ["Second", "First"]


def test_snapshot_segments_returns_independent_copy():
    segments = _segments()

    snapshot = snapshot_segments(segments)

    assert snapshot == segments
    assert snapshot is not segments
    assert snapshot[0] is not segments[0]


def test_save_and_load_subtitle_draft_roundtrip(tmp_path):
    path = tmp_path / "draft.json"

    saved_path = save_subtitle_draft(_segments(), path)
    loaded = load_subtitle_draft(saved_path)

    assert loaded == _segments()
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["version"] == 1


def test_load_subtitle_draft_rejects_unknown_version(tmp_path):
    path = tmp_path / "draft.json"
    path.write_text('{"version": 99, "segments": []}', encoding="utf-8")

    with pytest.raises(SubtitleEditError, match="Unsupported"):
        load_subtitle_draft(path)


def test_editing_invalid_index_raises_domain_error():
    with pytest.raises(SubtitleEditError, match="out of range"):
        edit_segment_text(_segments(), 99, text="Nope")
