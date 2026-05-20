import pytest

from subtitle_pipeline.errors import ConfigError
from subtitle_pipeline.glossary import load_translation_glossary


def test_load_translation_glossary_accepts_mapping(tmp_path):
    path = tmp_path / "glossary.json"
    path.write_text('{"CaptionFlow": "CaptionFlow", "voice over": "doblaje"}', encoding="utf-8")

    assert load_translation_glossary(str(path)) == {
        "CaptionFlow": "CaptionFlow",
        "voice over": "doblaje",
    }


def test_load_translation_glossary_accepts_source_target_list(tmp_path):
    path = tmp_path / "glossary.json"
    path.write_text('[{"source": "render", "target": "exportar"}]', encoding="utf-8")

    assert load_translation_glossary(str(path)) == {"render": "exportar"}


def test_load_translation_glossary_rejects_missing_file(tmp_path):
    with pytest.raises(ConfigError, match="Translation glossary not found"):
        load_translation_glossary(str(tmp_path / "missing.json"))
