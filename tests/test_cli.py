import json

from subtitle_pipeline.__main__ import main
from subtitle_pipeline.projects import load_project


def test_config_show_prints_defaults(capsys):
    main(["config", "show"])

    output = json.loads(capsys.readouterr().out)

    assert output["translator"] == "claude"
    assert output["tts_provider"] == "edge-tts"


def test_config_init_creates_file(tmp_path, capsys):
    path = tmp_path / "config.json"

    main(["config", "init", "--path", str(path)])

    assert path.exists()
    assert "Created config:" in capsys.readouterr().out


def test_project_create_add_job_and_list(tmp_path, capsys):
    root_dir = tmp_path / "project"
    project_path = root_dir / "captionflow_project.json"

    main(["project", "create", "--name", "Demo", "--root-dir", str(root_dir)])
    assert project_path.exists()

    main(
        [
            "project",
            "add-job",
            "--project",
            str(project_path),
            "--input",
            "video.mp4",
            "--output-dir",
            "out",
        ]
    )
    project = load_project(project_path)
    job = project.jobs[0]

    main(["project", "list", "--project", str(project_path)])
    output = capsys.readouterr().out

    assert job.id in output
    assert "pending" in output
    assert "video.mp4" in output
