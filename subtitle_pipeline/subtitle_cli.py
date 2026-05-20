from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .errors import SubtitleEditError
from .subtitle_editor import (
    delete_segment,
    edit_segment_text,
    load_subtitle_draft,
    merge_segments,
    normalize_segment_order,
    save_subtitle_draft,
    shift_segment_time,
    split_segment,
    validate_segments,
)


def handle_subtitle_command(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description="Inspect and edit subtitle drafts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    _add_draft_arg(subparsers.add_parser("list", help="List draft segments."))
    _add_draft_arg(subparsers.add_parser("validate", help="Validate draft timings and text."))

    edit_parser = subparsers.add_parser("edit", help="Edit segment text.")
    _add_draft_arg(edit_parser)
    _add_index_arg(edit_parser)
    edit_parser.add_argument("--text", default=None)
    edit_parser.add_argument("--translated", default=None)
    _add_output_arg(edit_parser)

    shift_parser = subparsers.add_parser("shift", help="Edit segment timing.")
    _add_draft_arg(shift_parser)
    _add_index_arg(shift_parser)
    shift_parser.add_argument("--start", type=float, default=None)
    shift_parser.add_argument("--end", type=float, default=None)
    _add_output_arg(shift_parser)

    delete_parser = subparsers.add_parser("delete", help="Delete one segment.")
    _add_draft_arg(delete_parser)
    _add_index_arg(delete_parser)
    _add_output_arg(delete_parser)

    merge_parser = subparsers.add_parser("merge", help="Merge a segment range.")
    _add_draft_arg(merge_parser)
    merge_parser.add_argument("--start-index", type=int, required=True)
    merge_parser.add_argument("--end-index", type=int, required=True)
    merge_parser.add_argument("--separator", default=" ")
    _add_output_arg(merge_parser)

    split_parser = subparsers.add_parser("split", help="Split one segment into two.")
    _add_draft_arg(split_parser)
    _add_index_arg(split_parser)
    split_parser.add_argument("--time", type=float, required=True)
    split_parser.add_argument("--first-text", required=True)
    split_parser.add_argument("--second-text", required=True)
    split_parser.add_argument("--first-translated", default="")
    split_parser.add_argument("--second-translated", default="")
    _add_output_arg(split_parser)

    normalize_parser = subparsers.add_parser("normalize", help="Sort segments by time.")
    _add_draft_arg(normalize_parser)
    _add_output_arg(normalize_parser)

    args = parser.parse_args(argv)
    try:
        _dispatch(args)
    except SubtitleEditError as exc:
        print(f"Subtitle edit error: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


def _dispatch(args: argparse.Namespace) -> None:
    segments = load_subtitle_draft(args.draft)

    if args.command == "list":
        for index, segment in enumerate(segments, 1):
            translated = f"\t{segment.translated}" if segment.translated else ""
            print(f"{index}\t{segment.start:.3f}\t{segment.end:.3f}\t{segment.text}{translated}")
        return

    if args.command == "validate":
        issues = validate_segments(segments)
        if not issues:
            print("OK: no subtitle issues found.")
            return
        for issue in issues:
            index = "" if issue.index is None else f" segment={issue.index + 1}"
            print(f"{issue.severity}\t{issue.code}{index}\t{issue.message}")
        raise SystemExit(1)

    edited = _edit_segments(args, segments)
    output_path = Path(args.output) if args.output else Path(args.draft)
    save_subtitle_draft(edited, output_path)
    print(f"Saved draft: {output_path}")


def _edit_segments(args: argparse.Namespace, segments):
    if args.command == "edit":
        return edit_segment_text(
            segments,
            _to_zero_based(args.index),
            text=args.text,
            translated=args.translated,
        )
    if args.command == "shift":
        return shift_segment_time(
            segments,
            _to_zero_based(args.index),
            start=args.start,
            end=args.end,
        )
    if args.command == "delete":
        return delete_segment(segments, _to_zero_based(args.index))
    if args.command == "merge":
        return merge_segments(
            segments,
            _to_zero_based(args.start_index),
            _to_zero_based(args.end_index),
            separator=args.separator,
        )
    if args.command == "split":
        return split_segment(
            segments,
            _to_zero_based(args.index),
            args.time,
            args.first_text,
            args.second_text,
            first_translated=args.first_translated,
            second_translated=args.second_translated,
        )
    if args.command == "normalize":
        return normalize_segment_order(segments)
    raise SubtitleEditError(f"Unsupported subtitle command: {args.command}")


def _add_draft_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--draft", required=True, help="Path to a subtitle draft JSON file.")


def _add_index_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--index", type=int, required=True, help="1-based segment index.")


def _add_output_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--output", default=None, help="Optional output draft path.")


def _to_zero_based(index: int) -> int:
    if index < 1:
        raise SubtitleEditError("Segment indexes are 1-based and must be greater than zero.")
    return index - 1
