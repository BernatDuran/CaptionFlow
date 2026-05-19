import os
import shutil
import tempfile

from .models import PipelineResult, SubtitleConfig
from .audio_extractor import extract_audio
from .formatter import write_subtitles
from .progress import EventSink, emit_event
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
    event_sink: EventSink | None = None,
) -> list[str]:
    result = run_subtitle_pipeline_detailed(
        config,
        transcription_provider,
        translation_provider,
        event_sink,
    )
    return result.output_files


def run_subtitle_pipeline_detailed(
    config: SubtitleConfig,
    transcription_provider: TranscriptionProvider | None = None,
    translation_provider: TranslationProvider | None = None,
    event_sink: EventSink | None = None,
) -> PipelineResult:
    validate_config(config)
    transcription_provider = transcription_provider or create_transcription_provider(config)
    provider_metadata = []

    base_name = os.path.splitext(os.path.basename(config.input_path))[0]
    tmp_dir = tempfile.mkdtemp(prefix="subtitle_")

    try:
        # 1. Extract audio
        emit_event(
            event_sink,
            "extract",
            "started",
            f"Extracting audio from {config.input_path}...",
            details={"input_path": config.input_path},
        )
        audio_path = extract_audio(
            config.input_path,
            os.path.join(tmp_dir, f"{base_name}.wav"),
        )
        emit_event(
            event_sink,
            "extract",
            "completed",
            f"Audio extracted: {audio_path}",
            details={"audio_path": audio_path},
        )

        # 2. Transcribe
        provider_config = transcription_provider.config
        emit_event(
            event_sink,
            "transcribe",
            "started",
            f"Transcribing with {provider_config.name} ({provider_config.model})...",
            details={
                "provider": provider_config.name,
                "model": provider_config.model,
            },
        )
        transcription = transcription_provider.transcribe(audio_path, config.source_lang)
        provider_metadata.append(transcription.metadata)
        segments = transcription.segments
        emit_event(
            event_sink,
            "transcribe",
            "completed",
            f"  {len(segments)} segments found.",
            details={"segment_count": len(segments)},
        )

        # 3. Translate (skip if same language)
        use_translated = False
        if config.source_lang != config.target_lang:
            translation_provider = translation_provider or create_translation_provider(config)
            provider_config = translation_provider.config
            emit_event(
                event_sink,
                "translate",
                "started",
                f"Translating {config.source_lang} -> {config.target_lang} "
                f"({provider_config.name}/{provider_config.model})...",
                details={
                    "source_lang": config.source_lang,
                    "target_lang": config.target_lang,
                    "provider": provider_config.name,
                    "model": provider_config.model,
                },
            )
            translation = translation_provider.translate_segments(
                segments,
                config.source_lang,
                config.target_lang,
            )
            provider_metadata.append(translation.metadata)
            segments = translation.segments
            use_translated = True
            emit_event(
                event_sink,
                "translate",
                "completed",
                "  Translation complete.",
                details={"segment_count": len(segments)},
            )

        # 4. Write subtitle files
        output_files = write_subtitles(
            segments, config.output_dir, base_name, config.formats, use_translated
        )
        for output_file in output_files:
            emit_event(
                event_sink,
                "export",
                "completed",
                f"  Created: {output_file}",
                details={"output_file": output_file},
            )

        # 5. Dubbing
        if config.dub:
            from .dubbing import run_dubbing_pipeline_detailed

            dubbing_result = run_dubbing_pipeline_detailed(
                segments,
                config,
                tts_provider=create_tts_provider(config),
                event_sink=event_sink,
            )
            dubbed_video = dubbing_result.output_video
            provider_metadata.append(dubbing_result.provider_metadata)
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
            emit_event(
                event_sink,
                "burn_in",
                "started",
                "Burning subtitles into video...",
                details={"output_video": output_video},
            )
            _burn_subtitles(config.input_path, srt_path, output_video)
            output_files.append(output_video)
            emit_event(
                event_sink,
                "burn_in",
                "completed",
                f"  Created: {output_video}",
                details={"output_file": output_video},
            )

        return PipelineResult(
            output_files=output_files,
            segments=segments,
            provider_metadata=provider_metadata,
        )

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
