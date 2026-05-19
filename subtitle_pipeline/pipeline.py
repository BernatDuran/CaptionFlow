import os
import shutil
import tempfile

from .models import SubtitleConfig
from .audio_extractor import extract_audio
from .formatter import write_subtitles
from .providers import (
    TranscriptionProvider,
    TranslationProvider,
    create_transcription_provider,
    create_translation_provider,
    create_tts_provider,
)
from .validation import validate_config


def _burn_subtitles(video_path: str, srt_path: str, output_path: str):
    import subprocess

    srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
    subprocess.run(
        [
            "ffmpeg", "-i", video_path,
            "-vf", f"subtitles='{srt_escaped}'",
            "-c:a", "copy",
            "-y", output_path,
        ],
        check=True,
    )


def run_subtitle_pipeline(
    config: SubtitleConfig,
    transcription_provider: TranscriptionProvider | None = None,
    translation_provider: TranslationProvider | None = None,
) -> list[str]:
    validate_config(config)
    transcription_provider = transcription_provider or create_transcription_provider(config)

    base_name = os.path.splitext(os.path.basename(config.input_path))[0]
    tmp_dir = tempfile.mkdtemp(prefix="subtitle_")

    try:
        # 1. Extract audio
        print(f"Extracting audio from {config.input_path}...")
        audio_path = extract_audio(
            config.input_path,
            os.path.join(tmp_dir, f"{base_name}.wav"),
        )

        # 2. Transcribe
        provider_config = transcription_provider.config
        print(f"Transcribing with {provider_config.name} ({provider_config.model})...")
        transcription = transcription_provider.transcribe(audio_path, config.source_lang)
        segments = transcription.segments
        print(f"  {len(segments)} segments found.")

        # 3. Translate (skip if same language)
        use_translated = False
        if config.source_lang != config.target_lang:
            translation_provider = translation_provider or create_translation_provider(config)
            provider_config = translation_provider.config
            print(
                f"Translating {config.source_lang} -> {config.target_lang} "
                f"({provider_config.name}/{provider_config.model})..."
            )
            translation = translation_provider.translate_segments(
                segments,
                config.source_lang,
                config.target_lang,
            )
            segments = translation.segments
            use_translated = True
            print("  Translation complete.")

        # 4. Write subtitle files
        output_files = write_subtitles(
            segments, config.output_dir, base_name, config.formats, use_translated
        )
        for f in output_files:
            print(f"  Created: {f}")

        # 5. Dubbing
        if config.dub:
            from .dubbing import run_dubbing_pipeline

            dubbed_video = run_dubbing_pipeline(
                segments,
                config,
                tts_provider=create_tts_provider(config),
            )
            output_files.append(dubbed_video)

        # 6. Burn subtitles into video
        if config.burn_in:
            srt_path = os.path.join(config.output_dir, f"{base_name}.srt")
            if not os.path.isfile(srt_path):
                from .formatter import to_srt
                content = to_srt(segments, use_translated)
                with open(srt_path, "w", encoding="utf-8") as f:
                    f.write(content)

            output_video = os.path.join(config.output_dir, f"{base_name}_subtitled.mp4")
            print("Burning subtitles into video...")
            _burn_subtitles(config.input_path, srt_path, output_video)
            output_files.append(output_video)
            print(f"  Created: {output_video}")

        return output_files

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
