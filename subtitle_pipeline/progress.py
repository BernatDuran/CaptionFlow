from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Literal

PipelineStage = Literal[
    "extract",
    "transcription",
    "transcribe",
    "translation",
    "translate",
    "export",
    "tts",
    "dub",
    "burn_in",
]
PipelineEventStatus = Literal["started", "progress", "completed"]
EventSink = Callable[["PipelineEvent"], None]


@dataclass(frozen=True)
class PipelineEvent:
    stage: PipelineStage
    status: PipelineEventStatus
    message: str
    details: dict[str, Any] = field(default_factory=dict)


def emit_event(
    event_sink: EventSink | None,
    stage: PipelineStage,
    status: PipelineEventStatus,
    message: str,
    *,
    details: dict[str, Any] | None = None,
) -> None:
    if event_sink is None:
        return
    event_sink(
        PipelineEvent(
            stage=stage,
            status=status,
            message=message,
            details={} if details is None else details,
        )
    )


def console_event_sink(event: PipelineEvent) -> None:
    print(event.message)
