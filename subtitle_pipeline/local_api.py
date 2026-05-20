from __future__ import annotations

import json
import os
import string
from dataclasses import asdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from .app_config import (
    SUPPORTED_CONFIG_PRESETS,
    app_config_from_dict,
    load_app_config,
    recommended_app_config,
    save_app_config,
)
from .doctor import format_doctor_report, run_doctor
from .export_profiles import export_subtitles
from .job_runner import run_project_job
from .models import Segment, SubtitleConfig
from .pipeline import run_subtitle_pipeline_detailed
from .projects import (
    add_job,
    create_project,
    get_job,
    load_job_subtitle_draft,
    load_project,
    save_job_subtitle_draft,
    save_project,
)
from .providers import ProviderResultMetadata, list_provider_capabilities
from .subtitle_editor import validate_segments

API_KEY_ENV_VARS = ("OPENAI_API_KEY", "NANO_GPT_API_KEY", "ANTHROPIC_API_KEY")


class LocalApiService:
    def health(self) -> dict[str, Any]:
        return {"status": "ok"}

    def get_config(self, path: str | None = None) -> dict[str, Any]:
        return asdict(load_app_config(path))

    def put_config(self, payload: dict[str, Any]) -> dict[str, Any]:
        config = app_config_from_dict(payload.get("config", payload))
        saved_path = save_app_config(config, payload.get("path"))
        return {"path": str(saved_path), "config": asdict(config)}

    def create_config(self, payload: dict[str, Any]) -> dict[str, Any]:
        preset = payload.get("preset", "default")
        if preset not in SUPPORTED_CONFIG_PRESETS:
            raise ValueError(f"Unsupported config preset: {preset}")
        config = recommended_app_config(preset)
        path = save_app_config(config, payload.get("path"))
        return {"path": str(path), "config": asdict(config)}

    def providers(self) -> dict[str, Any]:
        providers = [asdict(provider) for provider in list_provider_capabilities()]
        return {"providers": providers}

    def filesystem(self, path: str | None = None, mode: str = "any") -> dict[str, Any]:
        base = _safe_browser_path(path)
        entries = [_path_entry(child, mode) for child in _iter_browser_children(base)]
        return {
            "path": str(base),
            "parent": str(base.parent) if base.parent != base else None,
            "home": str(Path.home()),
            "cwd": str(Path.cwd()),
            "roots": _filesystem_roots(),
            "entries": entries,
        }

    def doctor(self) -> dict[str, Any]:
        checks = run_doctor()
        return {
            "checks": [asdict(check) for check in checks],
            "report": format_doctor_report(checks),
        }

    def secrets_status(self) -> dict[str, Any]:
        return {
            "keys": {
                env_var: {
                    "configured": bool(os.environ.get(env_var)),
                    "preview": _mask_secret(os.environ.get(env_var)),
                }
                for env_var in API_KEY_ENV_VARS
            }
        }

    def set_secret(self, payload: dict[str, Any]) -> dict[str, Any]:
        env_var = str(payload["env_var"])
        if env_var not in API_KEY_ENV_VARS:
            raise ValueError(f"Unsupported API key env var: {env_var}")
        value = str(payload.get("value", "")).strip()
        if not value:
            os.environ.pop(env_var, None)
        else:
            os.environ[env_var] = value
        return self.secrets_status()

    def create_project(self, payload: dict[str, Any]) -> dict[str, Any]:
        project = create_project(str(payload["name"]), str(payload["root_dir"]))
        path = save_project(project)
        return {"path": str(path), "project": asdict(project)}

    def get_project(self, path: str) -> dict[str, Any]:
        project = load_project(path)
        return {"path": str(path), "project": asdict(project)}

    def add_project_job(self, payload: dict[str, Any]) -> dict[str, Any]:
        project_path = str(payload["project_path"])
        project = load_project(project_path)
        config = SubtitleConfig(
            input_path=str(payload["input_path"]),
            output_dir=str(payload.get("output_dir") or Path(project.root_dir) / "output"),
            source_lang=str(payload.get("source_lang", "en")),
            target_lang=str(payload.get("target_lang", "es")),
        )
        job = add_job(project, config)
        save_project(project, project_path)
        return {"job": asdict(job), "project": asdict(project)}

    def run_project_job(self, payload: dict[str, Any]) -> dict[str, Any]:
        project_path = str(payload["project_path"])
        job_id = str(payload["job_id"])
        project = load_project(project_path)
        job = get_job(project, job_id)
        events: list[dict[str, Any]] = []

        def collect_event(event) -> None:
            events.append(asdict(event))

        config_payload = payload.get("config", {})
        config = SubtitleConfig(
            input_path=job.input_path,
            output_dir=str(config_payload.get("output_dir") or Path(project.root_dir) / "output"),
            source_lang=str(config_payload.get("source_lang") or job.source_lang),
            target_lang=str(config_payload.get("target_lang") or job.target_lang),
            transcription_provider=str(
                config_payload.get("transcription_provider", "faster-whisper")
            ),
            transcription_model=config_payload.get("transcription_model"),
            transcription_fallback_provider=config_payload.get("transcription_fallback_provider"),
            transcription_fallback_model=config_payload.get("transcription_fallback_model"),
            translation_provider=str(config_payload.get("translation_provider", "nllb")),
            translation_model=config_payload.get("translation_model"),
            translation_fallback_provider=config_payload.get("translation_fallback_provider"),
            translation_fallback_model=config_payload.get("translation_fallback_model"),
            translation_cache_enabled=bool(config_payload.get("translation_cache_enabled", False)),
            translation_cache_dir=config_payload.get("translation_cache_dir"),
            translation_glossary_path=config_payload.get("translation_glossary_path"),
            formats=list(config_payload.get("formats", ["srt"])),
            export_profile=str(config_payload.get("export_profile", "legacy")),
            api_key=config_payload.get("api_key"),
        )
        result = run_project_job(
            project,
            job_id,
            config,
            runner=lambda job_config: run_subtitle_pipeline_detailed(
                job_config,
                event_sink=collect_event,
            ),
            project_path=project_path,
        )
        return {
            "result": _pipeline_result_to_dict(result),
            "project": asdict(project),
            "events": events,
        }

    def get_draft(self, project_path: str, job_id: str) -> dict[str, Any]:
        project = load_project(project_path)
        segments = load_job_subtitle_draft(project, job_id)
        return {"segments": [_segment_to_dict(segment) for segment in segments]}

    def put_draft(self, payload: dict[str, Any]) -> dict[str, Any]:
        project_path = str(payload["project_path"])
        job_id = str(payload["job_id"])
        project = load_project(project_path)
        segments = [_segment_from_dict(segment) for segment in payload.get("segments", [])]
        path = save_job_subtitle_draft(project, job_id, segments)
        save_project(project, project_path)
        return {
            "draft_path": str(path),
            "issues": [asdict(issue) for issue in validate_segments(segments)],
        }

    def export_project_job(self, payload: dict[str, Any]) -> dict[str, Any]:
        project_path = str(payload["project_path"])
        job_id = str(payload["job_id"])
        project = load_project(project_path)
        job = get_job(project, job_id)
        segments = load_job_subtitle_draft(project, job_id)
        source_lang = str(payload.get("source_lang") or job.source_lang)
        target_lang = str(payload.get("target_lang") or job.target_lang)
        output_dir = str(payload.get("output_dir") or Path(project.root_dir) / "exports")
        result = export_subtitles(
            segments,
            output_dir,
            Path(job.input_path).stem,
            profile=str(payload.get("export_profile", "youtube")),
            formats=list(payload.get("formats", ["srt"])),
            source_lang=source_lang,
            target_lang=target_lang,
            use_translated=source_lang != target_lang,
            provider_metadata=[
                ProviderResultMetadata(**metadata) for metadata in job.provider_metadata
            ],
        )
        job.output_files = result.files
        save_project(project, project_path)
        return {"files": result.files, "project": asdict(project)}


def run_local_api_server(host: str = "127.0.0.1", port: int = 8765) -> None:
    service = LocalApiService()
    handler = _make_handler(service)
    server = ThreadingHTTPServer((host, port), handler)
    print(f"CaptionFlow local API running at http://{host}:{port}")
    server.serve_forever()


def _make_handler(service: LocalApiService):
    class LocalApiHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._handle("GET")

        def do_POST(self) -> None:
            self._handle("POST")

        def do_PUT(self) -> None:
            self._handle("PUT")

        def _handle(self, method: str) -> None:
            try:
                response = _dispatch_http(service, method, self.path, self._read_json())
                self._send_json(200, response)
            except Exception as exc:
                self._send_json(400, {"error": str(exc)})

        def _read_json(self) -> dict[str, Any]:
            length = int(self.headers.get("Content-Length", "0"))
            if length == 0:
                return {}
            return json.loads(self.rfile.read(length).decode("utf-8"))

        def _send_json(self, status: int, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self) -> None:
            self._send_json(200, {})

        def log_message(self, format: str, *args: Any) -> None:
            return

    return LocalApiHandler


def _dispatch_http(
    service: LocalApiService,
    method: str,
    raw_path: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    parsed = urlparse(raw_path)
    query = parse_qs(parsed.query)
    path = parsed.path.rstrip("/") or "/"
    if method == "GET" and path == "/health":
        return service.health()
    if method == "GET" and path == "/config":
        return service.get_config(_first(query, "path"))
    if method == "PUT" and path == "/config":
        return service.put_config(payload)
    if method == "POST" and path == "/config":
        return service.create_config(payload)
    if method == "GET" and path == "/providers":
        return service.providers()
    if method == "GET" and path == "/filesystem":
        return service.filesystem(_first(query, "path"), _first(query, "mode") or "any")
    if method == "GET" and path == "/doctor":
        return service.doctor()
    if method == "GET" and path == "/secrets":
        return service.secrets_status()
    if method == "PUT" and path == "/secrets":
        return service.set_secret(payload)
    if method == "POST" and path == "/projects":
        return service.create_project(payload)
    if method == "GET" and path == "/projects":
        return service.get_project(str(_first(query, "path")))
    if method == "POST" and path == "/projects/jobs":
        return service.add_project_job(payload)
    if method == "POST" and path == "/projects/jobs/run":
        return service.run_project_job(payload)
    if method == "GET" and path == "/projects/jobs/draft":
        return service.get_draft(str(_first(query, "project_path")), str(_first(query, "job_id")))
    if method == "PUT" and path == "/projects/jobs/draft":
        return service.put_draft(payload)
    if method == "POST" and path == "/projects/jobs/export":
        return service.export_project_job(payload)
    raise ValueError(f"Unsupported endpoint: {method} {path}")


def _first(query: dict[str, list[str]], key: str) -> str | None:
    values = query.get(key)
    return values[0] if values else None


def _segment_to_dict(segment: Segment) -> dict[str, Any]:
    return asdict(segment)


def _segment_from_dict(payload: dict[str, Any]) -> Segment:
    return Segment(
        start=float(payload["start"]),
        end=float(payload["end"]),
        text=str(payload["text"]),
        translated=str(payload.get("translated", "")),
    )


def _pipeline_result_to_dict(result) -> dict[str, Any]:
    return {
        "output_files": result.output_files,
        "segments": [_segment_to_dict(segment) for segment in result.segments],
        "provider_metadata": [asdict(metadata) for metadata in result.provider_metadata],
    }


def _mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"


def _safe_browser_path(path: str | None) -> Path:
    if not path:
        return Path.home()
    candidate = Path(path).expanduser()
    if candidate.is_file():
        return candidate.parent
    return candidate


def _iter_browser_children(base: Path) -> list[Path]:
    if not base.exists():
        raise ValueError(f"Path does not exist: {base}")
    if not base.is_dir():
        raise ValueError(f"Path is not a directory: {base}")
    try:
        children = list(base.iterdir())
    except PermissionError:
        return []
    return sorted(children, key=lambda path: (not path.is_dir(), path.name.lower()))[:250]


def _path_entry(path: Path, mode: str) -> dict[str, Any]:
    is_dir = path.is_dir()
    suffix = path.suffix.lower()
    return {
        "name": path.name,
        "path": str(path),
        "is_dir": is_dir,
        "kind": "directory" if is_dir else "file",
        "selectable": _is_selectable_path(path, mode),
        "extension": suffix,
    }


def _is_selectable_path(path: Path, mode: str) -> bool:
    if mode == "directory":
        return path.is_dir()
    if mode == "project":
        return path.is_file() and path.name == "captionflow_project.json"
    if mode == "media":
        return path.is_file() and path.suffix.lower() in {
            ".aac",
            ".flac",
            ".m4a",
            ".mkv",
            ".mov",
            ".mp3",
            ".mp4",
            ".ogg",
            ".wav",
            ".webm",
        }
    if mode == "json":
        return path.is_file() and path.suffix.lower() == ".json"
    return True


def _filesystem_roots() -> list[str]:
    if os.name != "nt":
        return ["/"]
    roots = []
    for letter in string.ascii_uppercase:
        root = Path(f"{letter}:\\")
        if root.exists():
            roots.append(str(root))
    return roots
