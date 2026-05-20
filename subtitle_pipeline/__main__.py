import argparse
import json
import sys
from dataclasses import asdict

from .app_config import load_app_config, save_app_config
from .doctor import doctor_exit_code, format_doctor_report, run_doctor
from .errors import ConfigError
from .models import SubtitleConfig
from .progress import console_event_sink
from .providers import list_provider_names
from .projects import add_job, create_project, load_project, save_project


def main(argv: list[str] | None = None):
    argv = sys.argv[1:] if argv is None else argv
    if argv and argv[0] == "doctor":
        checks = run_doctor()
        print(format_doctor_report(checks))
        raise SystemExit(doctor_exit_code(checks))
    if argv and argv[0] == "config":
        _handle_config_command(argv[1:])
        return
    if argv and argv[0] == "project":
        _handle_project_command(argv[1:])
        return

    parser = argparse.ArgumentParser(
        description="Generate translated subtitles from video/audio files."
    )
    parser.add_argument("--input", required=True, help="Path to the input video/audio file")
    parser.add_argument("--source-lang", default="en", help="Source language (default: en)")
    parser.add_argument("--target-lang", default="es", help="Target language (default: es)")
    parser.add_argument(
        "--output-dir",
        default="./output",
        help="Output directory (default: ./output)",
    )
    parser.add_argument(
        "--model-size",
        default="large-v3",
        help="Legacy alias for --transcription-model (default: large-v3)",
    )
    parser.add_argument(
        "--transcription-provider",
        default="faster-whisper",
        choices=list_provider_names(task="transcription"),
        help="Transcription provider (default: faster-whisper)",
    )
    parser.add_argument(
        "--transcription-model",
        default=None,
        help="Transcription model (default: value of --model-size)",
    )
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
        choices=list_provider_names(task="translation"),
        help=(
            "Legacy alias for --translation-provider: claude (API) or nllb "
            "(local, offline) (default: claude)"
        ),
    )
    parser.add_argument(
        "--translation-provider",
        default=None,
        choices=list_provider_names(task="translation"),
        help="Translation provider. Overrides --translator when provided.",
    )
    parser.add_argument(
        "--translation-model",
        default=None,
        help="Translation model override for the selected provider.",
    )
    parser.add_argument(
        "--translation-fallback-provider",
        default=None,
        choices=list_provider_names(task="translation"),
        help="Optional fallback translation provider used when the primary provider fails.",
    )
    parser.add_argument(
        "--translation-fallback-model",
        default=None,
        help="Translation model override for the fallback provider.",
    )
    parser.add_argument(
        "--translation-cache",
        action="store_true",
        help="Enable local translation cache for deterministic API calls.",
    )
    parser.add_argument(
        "--translation-cache-dir",
        default=None,
        help="Directory for local translation cache entries.",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Anthropic API key (or set ANTHROPIC_API_KEY env var)",
    )
    # Dubbing options
    parser.add_argument("--dub", action="store_true", help="Generate dubbed video with TTS")
    parser.add_argument(
        "--tts-provider",
        default="edge-tts",
        choices=list_provider_names(task="tts"),
        help="TTS provider (default: edge-tts)",
    )
    parser.add_argument(
        "--tts-model",
        default="edge-tts",
        help="TTS model identifier (default: edge-tts)",
    )
    parser.add_argument(
        "--tts-voice",
        default="es-ES-AlvaroNeural",
        help="Edge-TTS voice (default: es-ES-AlvaroNeural)",
    )
    parser.add_argument(
        "--tts-rate",
        type=int,
        default=0,
        help="TTS speed adjustment -100 to 100 (default: 0)",
    )
    args = parser.parse_args(argv)

    config = SubtitleConfig(
        input_path=args.input,
        output_dir=args.output_dir,
        source_lang=args.source_lang,
        target_lang=args.target_lang,
        transcription_provider=args.transcription_provider,
        transcription_model=args.transcription_model or args.model_size,
        model_size=args.model_size,
        device=args.device,
        formats=args.formats,
        burn_in=args.burn_in,
        translation_provider=args.translation_provider or args.translator,
        translation_model=args.translation_model,
        translation_fallback_provider=args.translation_fallback_provider,
        translation_fallback_model=args.translation_fallback_model,
        translation_cache_enabled=args.translation_cache,
        translation_cache_dir=args.translation_cache_dir,
        translator=args.translator,
        api_key=args.api_key,
        dub=args.dub,
        tts_provider=args.tts_provider,
        tts_model=args.tts_model,
        tts_voice=args.tts_voice,
        tts_rate=args.tts_rate,
    )

    try:
        from .pipeline import run_subtitle_pipeline

        run_subtitle_pipeline(config, event_sink=console_event_sink)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


def _handle_config_command(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description="Manage CaptionFlow configuration.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    show_parser = subparsers.add_parser("show", help="Print effective app configuration.")
    show_parser.add_argument("--path", default=None, help="Optional config JSON path.")

    init_parser = subparsers.add_parser("init", help="Create a config file with defaults.")
    init_parser.add_argument("--path", default=None, help="Optional config JSON path.")

    args = parser.parse_args(argv)
    if args.command == "show":
        config = load_app_config(args.path)
        print(json.dumps(asdict(config), indent=2, sort_keys=True))
        return
    if args.command == "init":
        path = save_app_config(load_app_config(args.path), args.path)
        print(f"Created config: {path}")
        return


def _handle_project_command(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description="Manage CaptionFlow projects.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="Create a project file.")
    create_parser.add_argument("--name", required=True)
    create_parser.add_argument("--root-dir", required=True)

    add_job_parser = subparsers.add_parser("add-job", help="Add a pending job to a project.")
    add_job_parser.add_argument("--project", required=True)
    add_job_parser.add_argument("--input", required=True)
    add_job_parser.add_argument("--output-dir", default="./output")

    list_parser = subparsers.add_parser("list", help="List project jobs.")
    list_parser.add_argument("--project", required=True)

    args = parser.parse_args(argv)
    if args.command == "create":
        project = create_project(args.name, args.root_dir)
        path = save_project(project)
        print(f"Created project: {path}")
        return
    if args.command == "add-job":
        project = load_project(args.project)
        job = add_job(
            project,
            SubtitleConfig(input_path=args.input, output_dir=args.output_dir),
        )
        save_project(project, args.project)
        print(f"Added job: {job.id}")
        return
    if args.command == "list":
        project = load_project(args.project)
        for job in project.jobs:
            print(f"{job.id}\t{job.status}\t{job.input_path}")
        return


if __name__ == "__main__":
    main()
