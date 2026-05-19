import asyncio
import os

import edge_tts

from .models import Segment


async def _synthesize(text: str, voice: str, output_path: str, rate: int = 0):
    rates = f"+{rate}%" if rate >= 0 else f"{rate}%"
    await edge_tts.Communicate(text, voice, rate=rates).save(output_path)


def synthesize_segment(
    segment: Segment,
    output_path: str,
    voice: str = "es-ES-AlvaroNeural",
    rate: int = 0,
    use_translated: bool = True,
):
    text = segment.translated if (use_translated and segment.translated) else segment.text
    if not text.strip():
        return None
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    asyncio.run(_synthesize(text, voice, output_path, rate))
    return output_path


def synthesize_segments(
    segments: list[Segment],
    output_dir: str,
    voice: str = "es-ES-AlvaroNeural",
    rate: int = 0,
    use_translated: bool = True,
) -> list[str | None]:
    os.makedirs(output_dir, exist_ok=True)
    paths = []
    for i, seg in enumerate(segments):
        out_path = os.path.join(output_dir, f"seg_{i:04d}.wav")
        result = synthesize_segment(seg, out_path, voice, rate, use_translated)
        paths.append(result)
    return paths
