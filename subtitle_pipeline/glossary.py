from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .errors import ConfigError


def load_translation_glossary(path: str | None) -> dict[str, str]:
    if path is None:
        return {}

    glossary_path = Path(path)
    if not glossary_path.is_file():
        raise ConfigError(f"Translation glossary not found: {path}")

    try:
        payload = json.loads(glossary_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"Translation glossary is not valid JSON: {path}") from exc

    return _normalize_glossary(payload)


def _normalize_glossary(payload: Any) -> dict[str, str]:
    if isinstance(payload, dict):
        glossary = {str(source): str(target) for source, target in payload.items()}
    elif isinstance(payload, list):
        glossary = {}
        for item in payload:
            if not isinstance(item, dict) or "source" not in item or "target" not in item:
                raise ConfigError(
                    "Translation glossary list entries must contain source and target fields."
                )
            glossary[str(item["source"])] = str(item["target"])
    else:
        raise ConfigError("Translation glossary must be a JSON object or list.")

    return {
        source.strip(): target.strip()
        for source, target in glossary.items()
        if source.strip() and target.strip()
    }
