from subtitle_pipeline.models import SubtitleConfig
from subtitle_pipeline.providers import (
    EdgeTTSProvider,
    FasterWhisperProvider,
    TranslatorProviderAdapter,
    create_transcription_provider,
    create_translation_provider,
    create_tts_provider,
)


def test_create_transcription_provider_uses_config_model_and_device():
    config = SubtitleConfig(
        input_path="video.mp4",
        output_dir="out",
        model_size="base",
        device="cpu",
    )

    provider = create_transcription_provider(config)

    assert isinstance(provider, FasterWhisperProvider)
    assert provider.config.name == "faster-whisper"
    assert provider.config.model == "base"
    assert provider.config.options == {"device": "cpu"}


def test_create_translation_provider_uses_selected_translator():
    config = SubtitleConfig(
        input_path="video.mp4",
        output_dir="out",
        source_lang="en",
        target_lang="es",
        translator="nllb",
    )

    provider = create_translation_provider(config)

    assert isinstance(provider, TranslatorProviderAdapter)
    assert provider.config.name == "nllb"
    assert provider.config.model == "facebook/nllb-200-distilled-600M"


def test_create_tts_provider_returns_edge_tts_provider():
    config = SubtitleConfig(input_path="video.mp4", output_dir="out")

    provider = create_tts_provider(config)

    assert isinstance(provider, EdgeTTSProvider)
    assert provider.config.name == "edge-tts"
