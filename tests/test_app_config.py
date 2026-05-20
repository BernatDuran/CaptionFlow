import json

from subtitle_pipeline.app_config import (
    AppConfig,
    app_config_from_dict,
    default_config_path,
    load_app_config,
    recommended_app_config,
    save_app_config,
)


def test_load_app_config_returns_defaults_when_file_is_missing(tmp_path):
    config = load_app_config(tmp_path / "missing.json")

    assert config == AppConfig()


def test_save_and_load_app_config_roundtrip(tmp_path):
    path = tmp_path / "config.json"
    config = AppConfig(source_lang="es", target_lang="en", formats=["srt", "vtt"])

    saved_path = save_app_config(config, path)
    loaded = load_app_config(saved_path)

    assert saved_path == path
    assert loaded == config
    assert json.loads(path.read_text(encoding="utf-8"))["version"] == 1


def test_app_config_from_dict_merges_defaults_and_forces_supported_version():
    config = app_config_from_dict(
        {
            "version": 999,
            "translator": "nllb",
            "formats": "txt",
        }
    )

    assert config.version == 1
    assert config.translator == "nllb"
    assert config.formats == ["txt"]
    assert config.transcription_provider == "faster-whisper"
    assert config.transcription_model == "large-v3"
    assert config.tts_provider == "edge-tts"
    assert config.tts_model == "edge-tts"


def test_default_config_path_uses_captionflow_directory(tmp_path):
    path = default_config_path(home=tmp_path)

    assert path == tmp_path / ".captionflow" / "config.json"


def test_recommended_app_config_returns_personal_youtube_preset():
    config = recommended_app_config("personal-youtube")

    assert config.export_profile == "youtube"
    assert config.formats == ["srt", "vtt"]
    assert config.translation_provider == "nano-gpt"
    assert config.translation_fallback_provider == "openai"
    assert config.translation_cache_enabled is True
