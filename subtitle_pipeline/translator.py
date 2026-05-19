import os
from abc import ABC, abstractmethod

from .models import Segment

_LANG_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "ru": "Russian",
}

# NLLB uses BCP-47-like codes; map common ISO codes
_NLLB_LANG_MAP = {
    "en": "eng_Latn",
    "es": "spa_Latn",
    "fr": "fra_Latn",
    "de": "deu_Latn",
    "it": "ita_Latn",
    "pt": "por_Latn",
    "zh": "zho_Hans",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "ar": "arb_Arab",
    "ru": "rus_Cyrl",
}


def _resolve_lang(lang: str) -> str:
    code = _NLLB_LANG_MAP.get(lang)
    if code is None:
        raise ValueError(
            f"Unsupported language '{lang}'. "
            f"Supported: {list(_NLLB_LANG_MAP)}"
        )
    return code


class BaseTranslator(ABC):
    @abstractmethod
    def translate(self, text: str) -> str:
        ...

    def translate_segments(self, segments: list[Segment]) -> list[Segment]:
        texts = [seg.text for seg in segments]
        translated = self.translate_batch(texts)
        for seg, t in zip(segments, translated):
            seg.translated = t
        return segments

    def translate_batch(self, texts: list[str]) -> list[str]:
        return [self.translate(t) for t in texts]


class NLLBTranslator(BaseTranslator):
    def __init__(
        self,
        source_lang: str = "en",
        target_lang: str = "es",
        model_name: str = "facebook/nllb-200-distilled-600M",
    ):
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self._src_code = _resolve_lang(source_lang)
        self._tgt_code = _resolve_lang(target_lang)

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

        import torch

        if torch.cuda.is_available():
            self.model = self.model.cuda()

        self.tokenizer.src_lang = self._src_code

    def translate(self, text: str) -> str:
        return self.translate_batch([text])[0]

    def translate_batch(self, texts: list[str], batch_size: int = 16) -> list[str]:
        results = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            inputs = self.tokenizer(
                batch, return_tensors="pt", padding=True, truncation=True
            )
            if next(self.model.parameters()).is_cuda:
                inputs = {k: v.cuda() for k, v in inputs.items()}

            target_token_id = self.tokenizer.convert_tokens_to_ids(self._tgt_code)
            generated = self.model.generate(
                **inputs, forced_bos_token_id=target_token_id, max_new_tokens=256
            )
            decoded = self.tokenizer.batch_decode(generated, skip_special_tokens=True)
            results.extend(decoded)
        return results


class ClaudeTranslator(BaseTranslator):
    def __init__(
        self,
        source_lang: str = "en",
        target_lang: str = "es",
        api_key: str | None = None,
        model: str = "claude-sonnet-4-20250514",
    ):
        import anthropic

        self._src_name = _LANG_NAMES.get(source_lang, source_lang)
        self._tgt_name = _LANG_NAMES.get(target_lang, target_lang)
        key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise ValueError(
                "Claude API key required. Set ANTHROPIC_API_KEY env var or pass --api-key"
            )
        self.client = anthropic.Anthropic(api_key=key)
        self.model = model

    def translate(self, text: str) -> str:
        return self.translate_batch([text])[0]

    def translate_batch(self, texts: list[str], batch_size: int = 30) -> list[str]:
        results = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            numbered = "\n".join(f"{j+1}. {t}" for j, t in enumerate(batch))
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Translate the following numbered lines from {self._src_name} "
                            f"to {self._tgt_name}. Keep the same numbering. "
                            f"Keep proper nouns (brand names, product names) unchanged. "
                            f"Use natural, fluent {self._tgt_name}. "
                            f"Output ONLY the translated numbered lines, nothing else.\n\n"
                            f"{numbered}"
                        ),
                    }
                ],
            )
            lines = response.content[0].text.strip().split("\n")
            for line in lines:
                cleaned = line.strip()
                if cleaned and cleaned[0].isdigit():
                    # Remove numbering prefix like "1. "
                    parts = cleaned.split(". ", 1)
                    if len(parts) == 2:
                        results.append(parts[1])
                    else:
                        results.append(cleaned)
        return results
