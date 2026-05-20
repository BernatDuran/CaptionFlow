import pytest

from subtitle_pipeline.errors import SubtitleEditError
from subtitle_pipeline.models import Segment, SubtitleConfig
from subtitle_pipeline.projects import (
    PROJECT_FILE,
    add_job,
    create_project,
    load_job_subtitle_draft,
    load_project,
    save_job_subtitle_draft,
    save_project,
    update_job_status,
)


def test_create_project_sets_root_and_empty_jobs(tmp_path):
    project = create_project("Demo", tmp_path)

    assert project.name == "Demo"
    assert project.root_dir == str(tmp_path)
    assert project.jobs == []


def test_add_job_creates_pending_job_from_config(tmp_path):
    project = create_project("Demo", tmp_path)
    config = SubtitleConfig(input_path="video.mp4", output_dir="out")

    job = add_job(project, config)

    assert job.status == "pending"
    assert job.input_path == "video.mp4"
    assert job.source_lang == "en"
    assert job.target_lang == "es"
    assert project.jobs == [job]


def test_update_job_status_records_outputs_metadata_and_error(tmp_path):
    project = create_project("Demo", tmp_path)
    job = add_job(project, SubtitleConfig(input_path="video.mp4", output_dir="out"))

    updated = update_job_status(
        project,
        job.id,
        "completed",
        output_files=["out/video.srt"],
        provider_metadata=[{"provider": "fake", "model": "test"}],
    )

    assert updated.status == "completed"
    assert updated.output_files == ["out/video.srt"]
    assert updated.provider_metadata == [{"provider": "fake", "model": "test"}]
    assert updated.error is None


def test_save_and_load_project_roundtrip(tmp_path):
    project = create_project("Demo", tmp_path)
    job = add_job(project, SubtitleConfig(input_path="video.mp4", output_dir="out"))
    update_job_status(project, job.id, "failed", error="boom")

    path = save_project(project)
    loaded = load_project(path)

    assert path == tmp_path / PROJECT_FILE
    assert loaded.name == project.name
    assert loaded.jobs[0].id == job.id
    assert loaded.jobs[0].status == "failed"
    assert loaded.jobs[0].error == "boom"


def test_save_job_subtitle_draft_records_path_and_roundtrips_segments(tmp_path):
    project = create_project("Demo", tmp_path)
    job = add_job(project, SubtitleConfig(input_path="video.mp4", output_dir="out"))
    segments = [Segment(start=0.0, end=1.0, text="hello", translated="hola")]

    draft_path = save_job_subtitle_draft(project, job.id, segments)
    loaded_segments = load_job_subtitle_draft(project, job.id)

    assert draft_path == tmp_path / "drafts" / f"{job.id}.json"
    assert job.subtitle_draft_path == str(draft_path)
    assert loaded_segments == segments


def test_load_job_subtitle_draft_requires_existing_draft_path(tmp_path):
    project = create_project("Demo", tmp_path)
    job = add_job(project, SubtitleConfig(input_path="video.mp4", output_dir="out"))

    with pytest.raises(SubtitleEditError, match="no subtitle draft"):
        load_job_subtitle_draft(project, job.id)
