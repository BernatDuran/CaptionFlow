from abc import ABC, abstractmethod

from .models import Segment


class BaseTranscriber(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str, language: str) -> list[Segment]:
        ...


class FasterWhisperTranscriber(BaseTranscriber):
    def __init__(self, model_size: str = "base", device: str = "auto"):
        from faster_whisper import WhisperModel

        if device == "auto":
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"

        compute_type = "float16" if device == "cuda" else "int8"
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(self, audio_path: str, language: str) -> list[Segment]:
        segments_iter, _info = self.model.transcribe(audio_path, language=language)
        return [
            Segment(start=s.start, end=s.end, text=s.text.strip())
            for s in segments_iter
        ]
