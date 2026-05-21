"""Tests for the NanoGPT Whisper transcription adapter.

Covers:
- _extract_nanogpt_transcript_text with all accepted response shapes
- _extract_nanogpt_transcript_text with an unrecognised response
- NanoGPTWhisperTranscriptionProvider default model
- NanoGPTWhisperTranscriptionProvider.transcribe wiring via a stub client
- Factories: create_transcription_provider returns NanoGPTWhisperTranscriptionProvider
- OpenAI Whisper path is unchanged (still OpenAICompatibleTranscriptionProvider)
"""
import pytest

from subtitle_pipeline.errors import ProviderRuntimeError
from subtitle_pipeline.models import Segment, SubtitleConfig
from subtitle_pipeline.providers import (
    NanoGPTWhisperTranscriptionProvider,
    OpenAICompatibleTranscriptionProvider,
    create_transcription_provider,
)
from subtitle_pipeline.providers.openai_compatible import (
    DEFAULT_NANOGPT_WHISPER_MODEL,
    _extract_nanogpt_transcript_text,
)


# ---------------------------------------------------------------------------
# _extract_nanogpt_transcript_text — response normalisation
# ---------------------------------------------------------------------------


def test_extract_text_from_text_key_dict():
    assert _extract_nanogpt_transcript_text({"text": "hello world"}) == "hello world"


def test_extract_text_from_text_attribute():
    class Obj:
        text = "hello attribute"

    assert _extract_nanogpt_transcript_text(Obj()) == "hello attribute"


def test_extract_text_from_transcription_key():
    assert _extract_nanogpt_transcript_text({"transcription": "hola mundo"}) == "hola mundo"


def test_extract_text_from_result_string():
    assert _extract_nanogpt_transcript_text({"result": "bonjour"}) == "bonjour"


def test_extract_text_from_result_nested_text():
    assert (
        _extract_nanogpt_transcript_text({"result": {"text": "nested text"}}) == "nested text"
    )


def test_extract_text_from_segments_list_fallback():
    """NanoGPT may return verbose_json with segments but no top-level .text."""
    raw = {
        "text": "",  # empty top-level text
        "segments": [
            {"text": "Hello"},
            {"text": "world"},
        ],
    }
    assert _extract_nanogpt_transcript_text(raw) == "Hello world"


def test_extract_text_from_segments_list_no_text_key():
    """verbose_json without any top-level text key at all."""
    raw = {
        "segments": [
            {"id": 0, "text": "Bonjour"},
            {"id": 1, "text": "le monde"},
        ],
    }
    assert _extract_nanogpt_transcript_text(raw) == "Bonjour le monde"


def test_extract_text_prefers_text_over_transcription():
    raw = {"text": "primary", "transcription": "secondary"}
    assert _extract_nanogpt_transcript_text(raw) == "primary"


def test_extract_text_strips_whitespace():
    assert _extract_nanogpt_transcript_text({"text": "  trimmed  "}) == "trimmed"


def test_extract_text_raises_on_unrecognised_format():
    with pytest.raises(ProviderRuntimeError, match="unrecognised response format"):
        _extract_nanogpt_transcript_text({"unknown_field": "data"})


def test_extract_text_raises_includes_available_keys():
    with pytest.raises(ProviderRuntimeError, match="available_key"):
        _extract_nanogpt_transcript_text({"available_key": 42})


def test_extract_text_raises_on_empty_text():
    """Empty strings should NOT be accepted as valid transcripts."""
    with pytest.raises(ProviderRuntimeError):
        _extract_nanogpt_transcript_text({"text": "   "})


# ---------------------------------------------------------------------------
# NanoGPTWhisperTranscriptionProvider — unit
# ---------------------------------------------------------------------------


def test_nanogpt_whisper_provider_default_model():
    provider = NanoGPTWhisperTranscriptionProvider(api_key="fake-key")
    assert provider.config.model == DEFAULT_NANOGPT_WHISPER_MODEL
    assert provider.config.model == "whisper-1"


def test_nanogpt_whisper_provider_custom_model():
    provider = NanoGPTWhisperTranscriptionProvider(model="Whisper-Medium", api_key="fake-key")
    assert provider.config.model == "Whisper-Medium"


def test_nanogpt_whisper_provider_config_metadata():
    provider = NanoGPTWhisperTranscriptionProvider(api_key="fake-key")
    assert provider.config.name == "nano-gpt-whisper"
    assert provider.config.task == "transcription"
    assert provider.config.base_url == "https://nano-gpt.com/api/v1"
    assert provider.config.api_key_env_var == "NANO_GPT_API_KEY"


def test_nanogpt_whisper_provider_capabilities():
    provider = NanoGPTWhisperTranscriptionProvider(api_key="fake-key")
    caps = provider.capabilities()
    assert caps.name == "nano-gpt-whisper"
    assert caps.task == "transcription"
    assert caps.privacy_level == "api_cloud"


class _StubClient:
    """Fake AudioTranscriptionClient returning a configurable list of Segments."""

    def __init__(self, segments: list[Segment]):
        self._segments = segments

    def create_audio_transcription(self, *, model: str, audio_path: str, language: str):
        return self._segments


def test_nanogpt_whisper_provider_transcribe_wiring():
    expected = [Segment(start=0.0, end=0.0, text="stub transcript")]
    stub = _StubClient(expected)

    provider = NanoGPTWhisperTranscriptionProvider(client=stub)
    result = provider.transcribe("audio.mp3", "en")

    assert result.segments == expected
    assert result.metadata.provider == "nano-gpt-whisper"
    assert result.metadata.task == "transcription"


def test_nanogpt_whisper_provider_transcribe_metadata_includes_model():
    stub = _StubClient([Segment(start=0.0, end=0.0, text="text")])
    provider = NanoGPTWhisperTranscriptionProvider(model="Whisper-Large-V3", client=stub)
    result = provider.transcribe("audio.mp3", "es")
    assert result.metadata.model == "Whisper-Large-V3"


# ---------------------------------------------------------------------------
# Factories — integration routing
# ---------------------------------------------------------------------------


def test_create_transcription_provider_returns_nanogpt_whisper_provider():
    config = SubtitleConfig(
        input_path="video.mp4",
        output_dir="out",
        transcription_provider="nano-gpt-whisper",
        api_key="test-key",
    )
    provider = create_transcription_provider(config)

    assert isinstance(provider, NanoGPTWhisperTranscriptionProvider)
    assert provider.config.name == "nano-gpt-whisper"
    assert provider.config.model == DEFAULT_NANOGPT_WHISPER_MODEL


def test_create_transcription_provider_nanogpt_whisper_implicit_default_resets_large_v3():
    """Regression: SubtitleConfig.__post_init__ sets transcription_model='large-v3'
    when no model is given (inherited from model_size default).  The factory and
    the pipeline must both reset this faster-whisper sentinel to None so that
    NanoGPTWhisperTranscriptionProvider uses Whisper-Large-V3 instead of sending
    'large-v3' to the NanoGPT API.
    """
    # No transcription_model supplied → SubtitleConfig sets it to model_size="large-v3"
    config = SubtitleConfig(
        input_path="video.mp4",
        output_dir="out",
        transcription_provider="nano-gpt-whisper",
        api_key="test-key",
    )
    assert config.transcription_model == "large-v3"  # confirm SubtitleConfig behaviour

    provider = create_transcription_provider(config)

    assert isinstance(provider, NanoGPTWhisperTranscriptionProvider)
    # Must NOT forward "large-v3" to NanoGPT
    assert provider.config.model == DEFAULT_NANOGPT_WHISPER_MODEL
    assert provider.config.model != "large-v3"


def test_create_transcription_provider_nanogpt_whisper_respects_model_override():
    config = SubtitleConfig(
        input_path="video.mp4",
        output_dir="out",
        transcription_provider="nano-gpt-whisper",
        transcription_model="Whisper-Medium",
        api_key="test-key",
    )
    provider = create_transcription_provider(config)

    assert isinstance(provider, NanoGPTWhisperTranscriptionProvider)
    assert provider.config.model == "Whisper-Medium"


def test_create_transcription_provider_openai_whisper_unchanged():
    """OpenAI Whisper path must NOT be affected by the NanoGPT changes."""
    config = SubtitleConfig(
        input_path="video.mp4",
        output_dir="out",
        transcription_provider="openai-whisper",
        api_key="test-key",
    )
    provider = create_transcription_provider(config)

    assert isinstance(provider, OpenAICompatibleTranscriptionProvider)
    assert provider.config.name == "openai-whisper"
    assert provider.config.model == "whisper-1"
