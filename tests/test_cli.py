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


def test_pipeline_cli_accepts_provider_flags(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    captured = {}

    def fake_run_subtitle_pipeline(config, event_sink=None):
        captured["config"] = config
        captured["event_sink"] = event_sink
        return []

    monkeypatch.setattr(
        "subtitle_pipeline.pipeline.run_subtitle_pipeline",
        fake_run_subtitle_pipeline,
    )

    main(
        [
            "--input",
            str(input_path),
            "--output-dir",
            str(tmp_path / "out"),
            "--source-lang",
            "es",
            "--target-lang",
            "es",
            "--transcription-provider",
            "faster-whisper",
            "--transcription-model",
            "base",
            "--translation-provider",
            "nllb",
            "--translation-model",
            "custom-nllb",
            "--translation-fallback-provider",
            "openai",
            "--translation-fallback-model",
            "fallback-model",
            "--translation-cache",
            "--translation-cache-dir",
            str(tmp_path / "cache"),
            "--tts-provider",
            "edge-tts",
            "--tts-model",
            "edge-custom",
        ]
    )

    config = captured["config"]
    assert config.transcription_provider == "faster-whisper"
    assert config.transcription_model == "base"
    assert config.translation_provider == "nllb"
    assert config.translation_model == "custom-nllb"
    assert config.translation_fallback_provider == "openai"
    assert config.translation_fallback_model == "fallback-model"
    assert config.translation_cache_enabled is True
    assert config.translation_cache_dir == str(tmp_path / "cache")
    assert config.tts_provider == "edge-tts"
    assert config.tts_model == "edge-custom"
    assert captured["event_sink"] is not None
