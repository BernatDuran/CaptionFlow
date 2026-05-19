import argparse

from .models import SubtitleConfig
from .pipeline import run_subtitle_pipeline


def main():
    parser = argparse.ArgumentParser(
        description="Generate translated subtitles from video/audio files."
    )
    parser.add_argument("--input", required=True, help="Path to the input video/audio file")
    parser.add_argument("--source-lang", default="en", help="Source language (default: en)")
    parser.add_argument("--target-lang", default="es", help="Target language (default: es)")
    parser.add_argument("--output-dir", default="./output", help="Output directory (default: ./output)")
    parser.add_argument("--model-size", default="large-v3", help="Whisper model size (default: large-v3)")
    parser.add_argument("--device", default="auto", help="Device: auto, cuda, cpu (default: auto)")
    parser.add_argument(
        "--formats",
        nargs="+",
        default=["srt"],
        choices=["srt", "vtt", "txt"],
        help="Output formats (default: srt)",
    )
    parser.add_argument(
        "--burn-in",
        action="store_true",
        help="Burn subtitles into the video file",
    )
    parser.add_argument(
        "--translator",
        default="claude",
        choices=["claude", "nllb"],
        help="Translation engine: claude (API, best quality) or nllb (local, offline) (default: claude)",
    )
    parser.add_argument("--api-key", default=None, help="Anthropic API key (or set ANTHROPIC_API_KEY env var)")
    # Dubbing options
    parser.add_argument("--dub", action="store_true", help="Generate dubbed video with TTS")
    parser.add_argument("--tts-voice", default="es-ES-AlvaroNeural", help="Edge-TTS voice (default: es-ES-AlvaroNeural)")
    parser.add_argument("--tts-rate", type=int, default=0, help="TTS speed adjustment -100 to 100 (default: 0)")
    args = parser.parse_args()

    config = SubtitleConfig(
        input_path=args.input,
        output_dir=args.output_dir,
        source_lang=args.source_lang,
        target_lang=args.target_lang,
        model_size=args.model_size,
        device=args.device,
        formats=args.formats,
        burn_in=args.burn_in,
        translator=args.translator,
        api_key=args.api_key,
        dub=args.dub,
        tts_voice=args.tts_voice,
        tts_rate=args.tts_rate,
    )

    run_subtitle_pipeline(config)


if __name__ == "__main__":
    main()
