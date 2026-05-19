import json
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from .models import SubtitleConfig

PROJECT_FILE = "captionflow_project.json"
JobStatus = Literal["pending", "running", "completed", "failed", "cancelled"]


@dataclass
class JobRecord:
    id: str
    input_path: str
    status: JobStatus = "pending"
    output_files: list[str] = field(default_factory=list)
    provider_metadata: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
    created_at: str = field(default_factory=lambda: _utc_now())
    updated_at: str = field(default_factory=lambda: _utc_now())


@dataclass
class Project:
    name: str
    root_dir: str
    jobs: list[JobRecord] = field(default_factory=list)
    version: int = 1
    created_at: str = field(default_factory=lambda: _utc_now())
    updated_at: str = field(default_factory=lambda: _utc_now())


def create_project(name: str, root_dir: str | Path) -> Project:
    root = Path(root_dir)
    return Project(name=name, root_dir=str(root))


def add_job(project: Project, config: SubtitleConfig) -> JobRecord:
    job = JobRecord(id=str(uuid4()), input_path=config.input_path)
    project.jobs.append(job)
    touch_project(project)
    return job


def update_job_status(
    project: Project,
    job_id: str,
    status: JobStatus,
    *,
    output_files: list[str] | None = None,
    provider_metadata: list[dict[str, Any]] | None = None,
    error: str | None = None,
) -> JobRecord:
    job = get_job(project, job_id)
    job.status = status
    if output_files is not None:
        job.output_files = output_files
    if provider_metadata is not None:
        job.provider_metadata = provider_metadata
    job.error = error
    job.updated_at = _utc_now()
    touch_project(project)
    return job


def get_job(project: Project, job_id: str) -> JobRecord:
    for job in project.jobs:
        if job.id == job_id:
            return job
    raise ValueError(f"Unknown job id: {job_id}")


def save_project(project: Project, path: str | Path | None = None) -> Path:
    project_path = Path(path) if path is not None else Path(project.root_dir) / PROJECT_FILE
    project_path.parent.mkdir(parents=True, exist_ok=True)
    project.updated_at = _utc_now()
    with project_path.open("w", encoding="utf-8") as file:
        json.dump(asdict(project), file, indent=2, sort_keys=True)
        file.write("\n")
    return project_path


def load_project(path: str | Path) -> Project:
    project_path = Path(path)
    with project_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"Invalid project file: {project_path}")
    jobs = [JobRecord(**job) for job in data.get("jobs", [])]
    return Project(
        name=data["name"],
        root_dir=data["root_dir"],
        jobs=jobs,
        version=data.get("version", 1),
        created_at=data.get("created_at", _utc_now()),
        updated_at=data.get("updated_at", _utc_now()),
    )


def touch_project(project: Project) -> None:
    project.updated_at = _utc_now()


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()
