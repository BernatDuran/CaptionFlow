from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, replace
from typing import Any, Protocol, TypeVar

from ..errors import ConfigError, ProviderRuntimeError
from ..progress import EventSink, emit_event
from .contracts import ProviderConfig, ProviderResultMetadata, ProviderTask

TResult = TypeVar("TResult")


class ProviderFactory(Protocol):
    def __call__(self, config: ProviderConfig) -> Any:
        ...


@dataclass(frozen=True)
class ProviderRoute:
    task: ProviderTask
    primary: ProviderConfig
    fallback: ProviderConfig | None = None


class ProviderRouter:
    def __init__(
        self,
        provider_factory: ProviderFactory,
        *,
        event_sink: EventSink | None = None,
    ):
        self._provider_factory = provider_factory
        self._event_sink = event_sink

    def execute(
        self,
        route: ProviderRoute,
        operation: Callable[[Any], TResult],
    ) -> TResult:
        _validate_route(route)

        try:
            primary_provider = self._provider_factory(route.primary)
            result = operation(primary_provider)
            return _with_route_metadata(
                result,
                requested_provider=route.primary.name,
                fallback_used=False,
            )
        except ProviderRuntimeError as exc:
            if route.fallback is None:
                raise
            emit_event(
                self._event_sink,
                route.task,
                "progress",
                (
                    f"Provider {route.primary.name} failed; "
                    f"falling back to {route.fallback.name}."
                ),
                details={
                    "primary_provider": route.primary.name,
                    "fallback_provider": route.fallback.name,
                    "error": str(exc),
                },
            )

            fallback_provider = self._provider_factory(route.fallback)
            fallback_result = operation(fallback_provider)
            routed = _with_route_metadata(
                fallback_result,
                requested_provider=route.primary.name,
                fallback_used=True,
                warning=(
                    f"Fallback used after provider {route.primary.name} failed: {exc}"
                ),
            )
            emit_event(
                self._event_sink,
                route.task,
                "completed",
                f"Fallback provider {route.fallback.name} completed.",
                details={
                    "requested_provider": route.primary.name,
                    "actual_provider": route.fallback.name,
                },
            )
            return routed


def _validate_route(route: ProviderRoute) -> None:
    if route.primary.task != route.task:
        raise ConfigError(
            f"Primary provider task '{route.primary.task}' does not match route '{route.task}'."
        )
    if route.fallback is not None and route.fallback.task != route.task:
        raise ConfigError(
            f"Fallback provider task '{route.fallback.task}' does not match route '{route.task}'."
        )


def _with_route_metadata(
    result: TResult,
    *,
    requested_provider: str,
    fallback_used: bool,
    warning: str | None = None,
) -> TResult:
    metadata = getattr(result, "metadata", None)
    if not isinstance(metadata, ProviderResultMetadata):
        return result

    warnings = list(metadata.warnings)
    if warning is not None:
        warnings.append(warning)

    routed_metadata = replace(
        metadata,
        requested_provider=requested_provider,
        api_provider=metadata.api_provider or metadata.provider,
        fallback_used=fallback_used,
        warnings=warnings,
    )
    return replace(result, metadata=routed_metadata)
