import pytest

from subtitle_pipeline.__main__ import main
from subtitle_pipeline.models import Segment
from subtitle_pipeline.subtitle_editor import load_subtitle_draft, save_subtitle_draft


def _draft_path(tmp_path):
    path = tmp_path / "draft.json"
    save_subtitle_draft(
        [
            Segment(start=0.0, end=1.0, text="Hello", translated="Hola"),
            Segment(start=1.5, end=2.0, text="World", translated="Mundo"),
        ],
        path,
    )
    return path


def test_subtitle_cli_lists_draft_segments(tmp_path, capsys):
    path = _draft_path(tmp_path)

    main(["subtitle", "list", "--draft", str(path)])

    output = capsys.readouterr().out
    assert "1\t0.000\t1.000\tHello\tHola" in output
    assert "2\t1.500\t2.000\tWorld\tMundo" in output


def test_subtitle_cli_validates_draft(tmp_path, capsys):
    path = _draft_path(tmp_path)

    main(["subtitle", "validate", "--draft", str(path)])

    assert "OK: no subtitle issues found." in capsys.readouterr().out


def test_subtitle_cli_edits_translated_text_in_place(tmp_path, capsys):
    path = _draft_path(tmp_path)

    main(
        [
            "subtitle",
            "edit",
            "--draft",
            str(path),
            "--index",
            "1",
            "--translated",
            "Hola mundo",
        ]
    )

    assert "Saved draft:" in capsys.readouterr().out
    assert load_subtitle_draft(path)[0].translated == "Hola mundo"


def test_subtitle_cli_merges_segments_to_output_path(tmp_path):
    path = _draft_path(tmp_path)
    output_path = tmp_path / "merged.json"

    main(
        [
            "subtitle",
            "merge",
            "--draft",
            str(path),
            "--start-index",
            "1",
            "--end-index",
            "2",
            "--output",
            str(output_path),
        ]
    )

    assert load_subtitle_draft(path) != load_subtitle_draft(output_path)
    assert load_subtitle_draft(output_path) == [
        Segment(start=0.0, end=2.0, text="Hello World", translated="Hola Mundo")
    ]


def test_subtitle_cli_reports_validation_errors(tmp_path, capsys):
    path = tmp_path / "draft.json"
    save_subtitle_draft([Segment(start=1.0, end=1.0, text="Bad")], path)

    with pytest.raises(SystemExit) as exc_info:
        main(["subtitle", "validate", "--draft", str(path)])

    assert exc_info.value.code == 1
    assert "invalid_timing" in capsys.readouterr().out
