import pytest

from subtitle_pipeline.errors import ConfigError
from subtitle_pipeline.models import SubtitleConfig
from subtitle_pipeline.validation import validate_config


def test_validate_config_accepts_minimal_valid_config(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="es",
        target_lang="es",
    )

    validate_config(config)


def test_validate_config_rejects_missing_input(tmp_path):
    config = SubtitleConfig(
        input_path=str(tmp_path / "missing.mp4"),
        output_dir=str(tmp_path / "out"),
    )

    with pytest.raises(ConfigError, match="Input file not found"):
        validate_config(config)


def test_validate_config_rejects_file_as_output_dir(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    output_file = tmp_path / "out.txt"
    output_file.write_text("not a directory")

    config = SubtitleConfig(input_path=str(input_path), output_dir=str(output_file))

    with pytest.raises(ConfigError, match="Output path is not a directory"):
        validate_config(config)


def test_validate_config_rejects_unsupported_format(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(input_path=str(input_path), output_dir=str(tmp_path / "out"))
    config.formats = ["srt", "ass"]

    with pytest.raises(ConfigError, match="Unsupported subtitle format"):
        validate_config(config)


def test_validate_config_requires_claude_key_when_translation_needed(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="en",
        target_lang="es",
        translator="claude",
        api_key=None,
    )

    with pytest.raises(ConfigError, match="API key required for translation provider 'claude'"):
        validate_config(config)


def test_validate_config_accepts_claude_key_from_environment(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="en",
        target_lang="es",
        translator="claude",
        api_key=None,
    )

    validate_config(config)


def test_validate_config_rejects_tts_rate_outside_supported_range(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="es",
        target_lang="es",
        tts_rate=120,
    )

    with pytest.raises(ConfigError, match="tts_rate"):
        validate_config(config)


def test_validate_config_uses_explicit_api_key_without_environment(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="en",
        target_lang="es",
        translator="claude",
        api_key="explicit-key",
    )

    validate_config(config)


def test_validate_config_rejects_unsupported_translation_provider_from_registry(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="en",
        target_lang="es",
        translation_provider="unknown",
    )

    with pytest.raises(ConfigError, match="Unsupported translation provider 'unknown'"):
        validate_config(config)


def test_validate_config_requires_nano_gpt_key_when_selected(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    monkeypatch.delenv("NANO_GPT_API_KEY", raising=False)

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="en",
        target_lang="es",
        translation_provider="nano-gpt",
    )

    with pytest.raises(ConfigError, match="NANO_GPT_API_KEY"):
        validate_config(config)


def test_validate_config_accepts_nano_gpt_key_from_environment(tmp_path, monkeypatch):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")
    monkeypatch.setenv("NANO_GPT_API_KEY", "test-key")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="en",
        target_lang="es",
        translation_provider="nano-gpt",
    )

    validate_config(config)


def test_validate_config_rejects_source_language_unsupported_by_provider(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="ca",
        target_lang="es",
        translation_provider="nllb",
    )

    with pytest.raises(ConfigError, match="Source language 'ca' is not supported"):
        validate_config(config)


def test_validate_config_rejects_target_language_unsupported_by_provider(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="en",
        target_lang="ca",
        translation_provider="nllb",
    )

    with pytest.raises(ConfigError, match="Target language 'ca' is not supported"):
        validate_config(config)


def test_validate_config_rejects_unsupported_transcription_provider(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        transcription_provider="unknown",
    )

    with pytest.raises(ConfigError, match="Unsupported transcription provider 'unknown'"):
        validate_config(config)


def test_validate_config_rejects_unsupported_tts_provider_when_dubbing(tmp_path):
    input_path = tmp_path / "video.mp4"
    input_path.write_bytes(b"fake")

    config = SubtitleConfig(
        input_path=str(input_path),
        output_dir=str(tmp_path / "out"),
        source_lang="es",
        target_lang="es",
        dub=True,
        tts_provider="unknown",
    )

    with pytest.raises(ConfigError, match="Unsupported tts provider 'unknown'"):
        validate_config(config)
