import json

from subtitle_pipeline.__main__ import main
from subtitle_pipeline.models import PipelineResult, Segment
from subtitle_pipeline.projects import load_project
from subtitle_pipeline.providers import ProviderResultMetadata


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


def test_config_init_accepts_personal_preset(tmp_path):
    path = tmp_path / "config.json"

    main(["config", "init", "--path", str(path), "--preset", "personal-youtube"])

    output = json.loads(path.read_text(encoding="utf-8"))
    assert output["export_profile"] == "youtube"
    assert output["translation_provider"] == "nano-gpt"
    assert output["translation_cache_enabled"] is True


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
            "--source-lang",
            "en",
            "--target-lang",
            "es",
        ]
    )
    project = load_project(project_path)
    job = project.jobs[0]

    main(["project", "list", "--project", str(project_path)])
    output = capsys.readouterr().out

    assert job.id in output
    assert "pending" in output
    assert "video.mp4" in output


def test_project_run_saves_outputs_metadata_and_draft(tmp_path, monkeypatch, capsys):
    root_dir = tmp_path / "project"
    project_path = root_dir / "captionflow_project.json"
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    main(["project", "create", "--name", "Demo", "--root-dir", str(root_dir)])
    main(
        [
            "project",
            "add-job",
            "--project",
            str(project_path),
            "--input",
            str(input_path),
            "--output-dir",
            "out",
        ]
    )
    job = load_project(project_path).jobs[0]

    def fake_run_subtitle_pipeline_detailed(config):
        assert config.input_path == str(input_path)
        assert config.export_profile == "review"
        return PipelineResult(
            output_files=["out/video.txt"],
            segments=[Segment(start=0.0, end=1.0, text="hello", translated="hola")],
            provider_metadata=[
                ProviderResultMetadata(
                    provider="fake",
                    model="test",
                    task="translation",
                )
            ],
        )

    monkeypatch.setattr(
        "subtitle_pipeline.pipeline.run_subtitle_pipeline_detailed",
        fake_run_subtitle_pipeline_detailed,
    )

    main(
        [
            "project",
            "run",
            "--project",
            str(project_path),
            "--job-id",
            job.id,
            "--translation-provider",
            "nllb",
            "--export-profile",
            "review",
        ]
    )

    output = capsys.readouterr().out
    project = load_project(project_path)
    completed = project.jobs[0]
    assert "Completed job:" in output
    assert completed.status == "completed"
    assert completed.output_files == ["out/video.txt"]
    assert completed.provider_metadata[0]["provider"] == "fake"
    assert completed.subtitle_draft_path is not None


def test_project_export_uses_saved_draft(tmp_path, capsys):
    root_dir = tmp_path / "project"
    project_path = root_dir / "captionflow_project.json"
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    main(["project", "create", "--name", "Demo", "--root-dir", str(root_dir)])
    main(["project", "add-job", "--project", str(project_path), "--input", str(input_path)])
    project = load_project(project_path)
    job = project.jobs[0]
    from subtitle_pipeline.projects import save_job_subtitle_draft, save_project

    save_job_subtitle_draft(
        project,
        job.id,
        [Segment(start=0.0, end=1.0, text="hello", translated="hola")],
    )
    job.provider_metadata = [
        {
            "provider": "fake",
            "model": "test",
            "task": "translation",
            "requested_provider": None,
            "api_provider": None,
            "base_url": None,
            "privacy_level": None,
            "fallback_used": False,
            "cache_hit": False,
            "duration_seconds": None,
            "estimated_cost": None,
            "warnings": [],
        }
    ]
    save_project(project, project_path)

    main(
        [
            "project",
            "export",
            "--project",
            str(project_path),
            "--job-id",
            job.id,
            "--export-profile",
            "youtube",
            "--source-lang",
            "en",
            "--target-lang",
            "es",
        ]
    )

    output = capsys.readouterr().out
    project = load_project(project_path)
    assert "Exported job:" in output
    assert any(path.endswith(".es.srt") for path in project.jobs[0].output_files)
    assert any(path.endswith("export_manifest.json") for path in project.jobs[0].output_files)


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
            "--transcription-fallback-provider",
            "openai-whisper",
            "--transcription-fallback-model",
            "whisper-1",
            "--export-profile",
            "youtube",
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
            "--translation-glossary",
            str(tmp_path / "glossary.json"),
            "--tts-provider",
            "edge-tts",
            "--tts-model",
            "edge-custom",
        ]
    )

    config = captured["config"]
    assert config.transcription_provider == "faster-whisper"
    assert config.transcription_model == "base"
    assert config.transcription_fallback_provider == "openai-whisper"
    assert config.transcription_fallback_model == "whisper-1"
    assert config.export_profile == "youtube"
    assert config.translation_provider == "nllb"
    assert config.translation_model == "custom-nllb"
    assert config.translation_fallback_provider == "openai"
    assert config.translation_fallback_model == "fallback-model"
    assert config.translation_cache_enabled is True
    assert config.translation_cache_dir == str(tmp_path / "cache")
    assert config.translation_glossary_path == str(tmp_path / "glossary.json")
    assert config.tts_provider == "edge-tts"
    assert config.tts_model == "edge-custom"
    assert captured["event_sink"] is not None
