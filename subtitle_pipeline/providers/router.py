from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, replace
from typing import Any, Protocol, TypeVar

from ..errors import (
    ConfigError,
    ProviderAuthError,
    ProviderDependencyError,
    ProviderRuntimeError,
)
from ..progress import EventSink, emit_event
from .contracts import (
    ProviderAvailabilityCheck,
    ProviderConfig,
    ProviderResultMetadata,
    ProviderTask,
)

TResult = TypeVar("TResult")


class ProviderFactory(Protocol):
    def __call__(self, config: ProviderConfig) -> Any:
        ...


class ProviderAvailabilityChecker(Protocol):
    def __call__(self, config: ProviderConfig) -> ProviderAvailabilityCheck:
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
        availability_checker: ProviderAvailabilityChecker | None = None,
        event_sink: EventSink | None = None,
    ):
        self._provider_factory = provider_factory
        self._availability_checker = availability_checker
        self._event_sink = event_sink

    def execute(
        self,
        route: ProviderRoute,
        operation: Callable[[Any], TResult],
    ) -> TResult:
        _validate_route(route)

        primary_availability = self._check_availability(route.primary)
        if primary_availability and primary_availability.status != "available":
            if route.fallback is None:
                _raise_unavailable(primary_availability)
            return self._execute_fallback(
                route,
                operation,
                reason=primary_availability.message,
            )

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
            return self._execute_fallback(route, operation, reason=str(exc))

    def _execute_fallback(
        self,
        route: ProviderRoute,
        operation: Callable[[Any], TResult],
        *,
        reason: str,
    ) -> TResult:
        if route.fallback is None:
            raise ProviderRuntimeError(reason)

        fallback_availability = self._check_availability(route.fallback)
        if fallback_availability and fallback_availability.status != "available":
            _raise_unavailable(fallback_availability)

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
                "error": reason,
            },
        )

        fallback_provider = self._provider_factory(route.fallback)
        fallback_result = operation(fallback_provider)
        routed = _with_route_metadata(
            fallback_result,
            requested_provider=route.primary.name,
            fallback_used=True,
            warning=f"Fallback used after provider {route.primary.name} failed: {reason}",
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

    def _check_availability(
        self,
        config: ProviderConfig,
    ) -> ProviderAvailabilityCheck | None:
        if self._availability_checker is None:
            return None
        return self._availability_checker(config)


def _validate_route(route: ProviderRoute) -> None:
    if route.primary.task != route.task:
        raise ConfigError(
            f"Primary provider task '{route.primary.task}' does not match route '{route.task}'."
        )
    if route.fallback is not None and route.fallback.task != route.task:
        raise ConfigError(
            f"Fallback provider task '{route.fallback.task}' does not match route '{route.task}'."
        )


def _raise_unavailable(availability: ProviderAvailabilityCheck) -> None:
    if availability.status == "missing_api_key":
        raise ProviderAuthError(
            f"Provider '{availability.name}' is missing credentials: {availability.message}"
        )
    if availability.status == "missing_dependency":
        raise ProviderDependencyError(
            f"Provider '{availability.name}' is missing dependencies: {availability.message}"
        )
    raise ProviderRuntimeError(
        f"Provider '{availability.name}' is unavailable: {availability.message}"
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
