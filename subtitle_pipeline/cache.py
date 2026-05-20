from __future__ import annotations

import hashlib
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from .models import Segment
from .providers import ProviderConfig

CACHE_VERSION = 1


class TranslationCache:
    def __init__(self, cache_dir: str | Path | None = None):
        self.cache_dir = Path(cache_dir) if cache_dir is not None else default_cache_dir()

    def get(self, key: str) -> list[Segment] | None:
        path = self._path_for_key(key)
        if not path.exists():
            return None
        try:
            with path.open("r", encoding="utf-8") as file:
                payload = json.load(file)
        except (OSError, json.JSONDecodeError):
            return None
        if payload.get("version") != CACHE_VERSION or payload.get("key") != key:
            return None
        segments = payload.get("segments")
        if not isinstance(segments, list):
            return None
        try:
            return [_segment_from_dict(segment) for segment in segments]
        except (KeyError, TypeError, ValueError):
            return None

    def set(self, key: str, segments: list[Segment]) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": CACHE_VERSION,
            "key": key,
            "segments": [asdict(segment) for segment in segments],
        }
        with self._path_for_key(key).open("w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2, sort_keys=True)
            file.write("\n")

    def _path_for_key(self, key: str) -> Path:
        return self.cache_dir / f"{key}.json"


def default_cache_dir() -> Path:
    return Path.home() / ".captionflow" / "cache"


def build_translation_cache_key(
    provider_config: ProviderConfig,
    *,
    source_lang: str,
    target_lang: str,
    segments: list[Segment],
) -> str:
    payload: dict[str, Any] = {
        "version": CACHE_VERSION,
        "task": provider_config.task,
        "provider": provider_config.name,
        "model": provider_config.model,
        "base_url": provider_config.base_url,
        "options": provider_config.options,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "segments": [
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text,
            }
            for segment in segments
        ],
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _segment_from_dict(data: object) -> Segment:
    if not isinstance(data, dict):
        raise ValueError("Cached segment must be an object")
    return Segment(
        start=float(data["start"]),
        end=float(data["end"]),
        text=str(data["text"]),
        translated=str(data.get("translated", "")),
    )
