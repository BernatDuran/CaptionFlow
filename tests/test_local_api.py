from subtitle_pipeline.local_api import LocalApiService


def test_local_api_config_and_providers(tmp_path):
    service = LocalApiService()
    config_path = tmp_path / "config.json"

    created = service.create_config({"path": str(config_path), "preset": "personal-youtube"})
    loaded = service.get_config(str(config_path))
    providers = service.providers()

    assert created["config"]["export_profile"] == "youtube"
    assert loaded["translation_provider"] == "nano-gpt"
    assert any(provider["name"] == "openai" for provider in providers["providers"])


def test_local_api_secret_status_and_set_secret(monkeypatch):
    service = LocalApiService()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    before = service.secrets_status()
    after = service.set_secret({"env_var": "OPENAI_API_KEY", "value": "sk-test-value"})

    assert before["keys"]["OPENAI_API_KEY"]["configured"] is False
    assert after["keys"]["OPENAI_API_KEY"]["configured"] is True
    assert after["keys"]["OPENAI_API_KEY"]["preview"] == "sk-t...alue"


def test_local_api_project_draft_and_export(tmp_path):
    service = LocalApiService()
    project_path = tmp_path / "demo" / "captionflow_project.json"

    created = service.create_project({"name": "Demo", "root_dir": str(tmp_path / "demo")})
    assert created["path"] == str(project_path)
    job_response = service.add_project_job(
        {
            "project_path": str(project_path),
            "input_path": str(tmp_path / "video.mp4"),
            "source_lang": "en",
            "target_lang": "es",
        }
    )
    job_id = job_response["job"]["id"]
    service.put_draft(
        {
            "project_path": str(project_path),
            "job_id": job_id,
            "segments": [
                {
                    "start": 0.0,
                    "end": 1.0,
                    "text": "hello",
                    "translated": "hola",
                }
            ],
        }
    )

    draft = service.get_draft(str(project_path), job_id)
    exported = service.export_project_job(
        {
            "project_path": str(project_path),
            "job_id": job_id,
            "export_profile": "youtube",
        }
    )

    assert draft["segments"][0]["translated"] == "hola"
    assert any(path.endswith(".es.srt") for path in exported["files"])
    assert any(path.endswith("export_manifest.json") for path in exported["files"])


def test_local_api_put_draft_reports_validation_issues(tmp_path):
    service = LocalApiService()
    project_path = tmp_path / "demo" / "captionflow_project.json"
    service.create_project({"name": "Demo", "root_dir": str(tmp_path / "demo")})
    job_id = service.add_project_job(
        {
            "project_path": str(project_path),
            "input_path": str(tmp_path / "video.mp4"),
        }
    )["job"]["id"]

    result = service.put_draft(
        {
            "project_path": str(project_path),
            "job_id": job_id,
            "segments": [{"start": 1.0, "end": 1.0, "text": "bad"}],
        }
    )

    assert result["issues"][0]["code"] == "invalid_timing"
