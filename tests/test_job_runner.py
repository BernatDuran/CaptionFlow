import pytest

from subtitle_pipeline.job_runner import run_project_job
from subtitle_pipeline.models import PipelineResult, Segment, SubtitleConfig
from subtitle_pipeline.projects import add_job, create_project, load_project, save_project
from subtitle_pipeline.providers import ProviderResultMetadata


def test_run_project_job_marks_completed_and_persists_metadata(tmp_path):
    project = create_project("Demo", tmp_path)
    config = SubtitleConfig(input_path="video.mp4", output_dir="out")
    job = add_job(project, config)
    project_path = save_project(project)

    def runner(received_config):
        assert received_config is config
        return PipelineResult(
            output_files=["out/video.srt"],
            segments=[Segment(start=0.0, end=1.0, text="hello")],
            provider_metadata=[
                ProviderResultMetadata(
                    provider="fake",
                    model="test",
                    task="transcription",
                )
            ],
        )

    result = run_project_job(project, job.id, config, runner=runner, project_path=project_path)
    loaded = load_project(project_path)

    assert result.output_files == ["out/video.srt"]
    assert project.jobs[0].status == "completed"
    assert loaded.jobs[0].status == "completed"
    assert loaded.jobs[0].output_files == ["out/video.srt"]
    assert loaded.jobs[0].provider_metadata[0]["provider"] == "fake"
    assert loaded.jobs[0].subtitle_draft_path is not None


def test_run_project_job_marks_failed_and_persists_error(tmp_path):
    project = create_project("Demo", tmp_path)
    config = SubtitleConfig(input_path="video.mp4", output_dir="out")
    job = add_job(project, config)
    project_path = save_project(project)

    def runner(received_config):
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError, match="boom"):
        run_project_job(project, job.id, config, runner=runner, project_path=project_path)

    loaded = load_project(project_path)

    assert project.jobs[0].status == "failed"
    assert project.jobs[0].error == "boom"
    assert loaded.jobs[0].status == "failed"
    assert loaded.jobs[0].error == "boom"
