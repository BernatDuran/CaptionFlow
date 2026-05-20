import pytest

from subtitle_pipeline.errors import TranslationError
from subtitle_pipeline.models import Segment
from subtitle_pipeline.providers import (
    ChatCompletionResult,
    OpenAICompatibleTranscriptionProvider,
    OpenAICompatibleTranslationProvider,
)


class FakeChatClient:
    def __init__(self, text: str):
        self.text = text
        self.calls = []

    def create_chat_completion(self, *, model, messages, max_tokens, temperature):
        self.calls.append(
            {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        )
        return ChatCompletionResult(text=self.text, estimated_cost=0.01)


class FakeAudioClient:
    def __init__(self):
        self.calls = []

    def create_audio_transcription(self, *, model, audio_path, language):
        self.calls.append({"model": model, "audio_path": audio_path, "language": language})
        return [Segment(start=0.0, end=1.0, text="hello")]


def _segments() -> list[Segment]:
    return [
        Segment(start=0.0, end=1.0, text="Hello"),
        Segment(start=1.0, end=2.0, text="World"),
    ]


def test_openai_compatible_translation_provider_translates_numbered_segments():
    client = FakeChatClient("1. Hola\n2. Mundo")
    provider = OpenAICompatibleTranslationProvider(
        "nano-gpt",
        "en",
        "es",
        client=client,
    )

    result = provider.translate_segments(_segments(), "en", "es")

    assert [segment.translated for segment in result.segments] == ["Hola", "Mundo"]
    assert result.segments[0].text == "Hello"
    assert result.metadata.provider == "nano-gpt"
    assert result.metadata.model == "qwen/qwen3.5-397b-a17b"
    assert result.metadata.base_url == "https://nano-gpt.com/api/v1"
    assert result.metadata.privacy_level == "api_cloud"
    assert result.metadata.estimated_cost == 0.01
    assert client.calls[0]["model"] == "qwen/qwen3.5-397b-a17b"
    assert "1. Hello" in client.calls[0]["messages"][1]["content"]


def test_openai_compatible_translation_provider_supports_openai_model_override():
    client = FakeChatClient("1. Hola\n2. Mundo")
    provider = OpenAICompatibleTranslationProvider(
        "openai",
        "en",
        "es",
        model="custom-model",
        client=client,
    )

    result = provider.translate_segments(_segments(), "en", "es")

    assert result.metadata.provider == "openai"
    assert result.metadata.model == "custom-model"
    assert result.metadata.base_url is None
    assert client.calls[0]["model"] == "custom-model"


def test_openai_compatible_translation_provider_adds_glossary_to_prompt():
    client = FakeChatClient("1. CaptionFlow")
    provider = OpenAICompatibleTranslationProvider(
        "openai",
        "en",
        "es",
        client=client,
        glossary={"CaptionFlow": "CaptionFlow"},
    )

    provider.translate_segments([Segment(start=0.0, end=1.0, text="CaptionFlow")], "en", "es")

    assert "- CaptionFlow => CaptionFlow" in client.calls[0]["messages"][1]["content"]


def test_openai_compatible_translation_provider_rejects_misaligned_response():
    client = FakeChatClient("1. Hola")
    provider = OpenAICompatibleTranslationProvider(
        "nano-gpt",
        "en",
        "es",
        client=client,
    )

    with pytest.raises(TranslationError, match="different number of segments"):
        provider.translate_segments(_segments(), "en", "es")


def test_openai_compatible_translation_provider_handles_empty_segments():
    client = FakeChatClient("")
    provider = OpenAICompatibleTranslationProvider(
        "nano-gpt",
        "en",
        "es",
        client=client,
    )

    result = provider.translate_segments([], "en", "es")

    assert result.segments == []
    assert client.calls == []


def test_openai_compatible_transcription_provider_returns_timed_segments(tmp_path):
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(b"fake")
    client = FakeAudioClient()
    provider = OpenAICompatibleTranscriptionProvider("openai-whisper", client=client)

    result = provider.transcribe(str(audio_path), "en")

    assert result.segments == [Segment(start=0.0, end=1.0, text="hello")]
    assert result.metadata.provider == "openai-whisper"
    assert result.metadata.model == "whisper-1"
    assert client.calls == [
        {"model": "whisper-1", "audio_path": str(audio_path), "language": "en"}
    ]
