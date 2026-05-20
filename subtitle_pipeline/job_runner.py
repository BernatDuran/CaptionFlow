from dataclasses import asdict
from pathlib import Path
from typing import Callable

from .models import PipelineResult, SubtitleConfig
from .projects import Project, save_job_subtitle_draft, save_project, update_job_status

PipelineRunner = Callable[[SubtitleConfig], PipelineResult]


def run_project_job(
    project: Project,
    job_id: str,
    config: SubtitleConfig,
    *,
    runner: PipelineRunner,
    project_path: str | Path | None = None,
) -> PipelineResult:
    update_job_status(project, job_id, "running", error=None)
    _save_if_requested(project, project_path)

    try:
        result = runner(config)
    except Exception as exc:
        update_job_status(project, job_id, "failed", error=str(exc))
        _save_if_requested(project, project_path)
        raise

    update_job_status(
        project,
        job_id,
        "completed",
        output_files=result.output_files,
        provider_metadata=[asdict(metadata) for metadata in result.provider_metadata],
        error=None,
    )
    save_job_subtitle_draft(project, job_id, result.segments)
    _save_if_requested(project, project_path)
    return result


def _save_if_requested(project: Project, project_path: str | Path | None) -> None:
    if project_path is not None:
        save_project(project, project_path)
