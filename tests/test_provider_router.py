import pytest

from subtitle_pipeline.errors import (
    ConfigError,
    ProviderAuthError,
    ProviderDependencyError,
    ProviderRuntimeError,
)
from subtitle_pipeline.models import Segment
from subtitle_pipeline.providers import (
    ProviderAvailabilityCheck,
    ProviderConfig,
    ProviderResultMetadata,
    ProviderRoute,
    ProviderRouter,
    TranslationResult,
)


class FakeProvider:
    def __init__(self, config: ProviderConfig, *, should_fail: bool = False):
        self.config = config
        self.should_fail = should_fail

    def translate(self):
        if self.should_fail:
            raise ProviderRuntimeError("temporary outage")
        return TranslationResult(
            segments=[Segment(start=0.0, end=1.0, text="hello", translated=self.config.name)],
            metadata=ProviderResultMetadata(
                provider=self.config.name,
                model=self.config.model,
                task=self.config.task,
                base_url=self.config.base_url,
                privacy_level="api_cloud",
            ),
        )


def _translation_config(name: str, model: str = "model") -> ProviderConfig:
    return ProviderConfig(
        name=name,
        task="translation",
        model=model,
        base_url=f"https://{name}.example/v1",
    )


def test_provider_router_returns_primary_result_without_fallback():
    route = ProviderRoute(task="translation", primary=_translation_config("primary"))
    router = ProviderRouter(lambda config: FakeProvider(config))

    result = router.execute(route, lambda provider: provider.translate())

    assert result.segments[0].translated == "primary"
    assert result.metadata.provider == "primary"
    assert result.metadata.requested_provider == "primary"
    assert result.metadata.fallback_used is False
    assert result.metadata.api_provider == "primary"


def test_provider_router_uses_fallback_on_runtime_error():
    route = ProviderRoute(
        task="translation",
        primary=_translation_config("primary"),
        fallback=_translation_config("fallback"),
    )
    events = []

    def factory(config):
        return FakeProvider(config, should_fail=config.name == "primary")

    router = ProviderRouter(factory, event_sink=events.append)

    result = router.execute(route, lambda provider: provider.translate())

    assert result.segments[0].translated == "fallback"
    assert result.metadata.provider == "fallback"
    assert result.metadata.requested_provider == "primary"
    assert result.metadata.fallback_used is True
    assert "Fallback used" in result.metadata.warnings[0]
    assert [(event.stage, event.status) for event in events] == [
        ("translation", "progress"),
        ("translation", "completed"),
    ]


def test_provider_router_uses_fallback_when_primary_preflight_fails():
    route = ProviderRoute(
        task="translation",
        primary=_translation_config("primary"),
        fallback=_translation_config("fallback"),
    )
    created = []

    def availability(config):
        if config.name == "primary":
            return ProviderAvailabilityCheck(
                name=config.name,
                task=config.task,
                status="missing_api_key",
                message="missing PRIMARY_KEY",
            )
        return ProviderAvailabilityCheck(
            name=config.name,
            task=config.task,
            status="available",
            message="available",
        )

    def factory(config):
        created.append(config.name)
        return FakeProvider(config)

    router = ProviderRouter(factory, availability_checker=availability)

    result = router.execute(route, lambda provider: provider.translate())

    assert created == ["fallback"]
    assert result.segments[0].translated == "fallback"
    assert result.metadata.requested_provider == "primary"
    assert result.metadata.fallback_used is True
    assert "missing PRIMARY_KEY" in result.metadata.warnings[0]


def test_provider_router_raises_when_primary_preflight_fails_without_fallback():
    route = ProviderRoute(task="translation", primary=_translation_config("primary"))

    def availability(config):
        return ProviderAvailabilityCheck(
            name=config.name,
            task=config.task,
            status="missing_dependency",
            message="missing package",
        )

    router = ProviderRouter(lambda config: FakeProvider(config), availability_checker=availability)

    with pytest.raises(ProviderDependencyError, match="missing dependencies"):
        router.execute(route, lambda provider: provider.translate())


def test_provider_router_raises_when_fallback_preflight_fails():
    route = ProviderRoute(
        task="translation",
        primary=_translation_config("primary"),
        fallback=_translation_config("fallback"),
    )

    def availability(config):
        status = "missing_api_key" if config.name == "fallback" else "missing_dependency"
        return ProviderAvailabilityCheck(
            name=config.name,
            task=config.task,
            status=status,
            message=f"{config.name} unavailable",
        )

    router = ProviderRouter(lambda config: FakeProvider(config), availability_checker=availability)

    with pytest.raises(ProviderAuthError, match="missing credentials"):
        router.execute(route, lambda provider: provider.translate())


def test_provider_router_does_not_fallback_on_config_error():
    route = ProviderRoute(
        task="translation",
        primary=_translation_config("primary"),
        fallback=_translation_config("fallback"),
    )
    router = ProviderRouter(lambda config: FakeProvider(config))

    with pytest.raises(ConfigError, match="bad config"):
        router.execute(route, lambda provider: (_ for _ in ()).throw(ConfigError("bad config")))


def test_provider_router_validates_route_task_alignment():
    route = ProviderRoute(
        task="translation",
        primary=ProviderConfig(name="bad", task="tts", model="model"),
    )
    router = ProviderRouter(lambda config: FakeProvider(config))

    with pytest.raises(ConfigError, match="does not match"):
        router.execute(route, lambda provider: provider.translate())
