# Current Pipeline Specification

## 1. Purpose

The current CaptionFlow pipeline converts a local video or audio file into subtitle files, and can optionally create a subtitled video or a TTS-dubbed video.

This specification describes the existing behavior before larger architectural changes. It is the baseline for future refactors, tests and provider-ready work.

## 2. Supported Inputs

Required input:

- `input_path`: path to an existing local media file.

Configuration inputs:

- `output_dir`: output directory. Created if it does not exist.
- `source_lang`: source language code. Defaults to `en`.
- `target_lang`: target language code. Defaults to `es`.
- `model_size`: faster-whisper model size. Defaults to `large-v3`.
- `device`: `auto`, `cuda` or `cpu`.
- `formats`: one or more subtitle formats: `srt`, `vtt`, `txt`.
- `translator`: `claude` or `nllb`.
- `api_key`: Anthropic API key when Claude translation is used.
- `burn_in`: whether to burn subtitles into the video.
- `dub`: whether to generate a TTS-dubbed video.
- `tts_voice`: Edge-TTS voice name.
- `tts_rate`: Edge-TTS speed adjustment from `-100` to `100`.

## 3. Pipeline Stages

### 3.1 Environment Doctor

The CLI supports a lightweight environment check:

```bash
python -m subtitle_pipeline doctor
```

The doctor command must not load AI models or import heavy pipeline dependencies.

It checks:

- Python version.
- `ffmpeg` executable availability.
- Required Python packages.
- `ANTHROPIC_API_KEY` presence.
- Initial AI provider availability for transcription, translation and TTS.

Expected behavior:

- Missing required runtime dependencies are reported as `FAIL`.
- Missing optional credentials are reported as `WARN`.
- Provider availability is reported using `provider:<task>:<name>` check names.
- The command exits with code `1` when at least one check fails.
- The command exits with code `0` when there are only passing checks or warnings.

### 3.2 Validate Configuration

The pipeline should fail before starting long-running work when:

- The input file does not exist.
- `output_dir` points to an existing file.
- Any requested subtitle format is unsupported.
- The translator is unsupported.
- Translation languages are unsupported by the selected translation provider.
- The device value is unsupported.
- `tts_rate` is outside the supported range.
- A remote translation provider requires an API key and none is available.

### 3.3 Extract Audio

The pipeline extracts a mono WAV file at 16 kHz using `ffmpeg`.

Expected behavior:

- Input media is read from `input_path`.
- Temporary audio is written into a temporary working directory.
- Temporary files are removed at the end of the run.

### 3.4 Transcribe

The pipeline uses a `TranscriptionProvider` to produce ordered transcript segments.
The default provider is `faster-whisper`.

Each segment contains:

- `start`: start time in seconds.
- `end`: end time in seconds.
- `text`: original transcription.
- `translated`: optional translated text.

### 3.5 Translate

If `source_lang` and `target_lang` are equal, translation is skipped.

If languages differ:

- `translator=claude` uses the Anthropic API.
- `translator=nllb` uses the local NLLB model.

Translation is routed through a `TranslationProvider`.

The translated text is stored in each segment's `translated` field.

### 3.6 Export Subtitles

The pipeline writes subtitle files to `output_dir` using the input file base name.

Supported outputs:

- `srt`: numbered subtitle blocks with comma millisecond separator.
- `vtt`: `WEBVTT` header and dot millisecond separator.
- `txt`: one subtitle text per line.

When translated text exists and translated output is requested, exporters prefer `translated`; otherwise they fall back to `text`.

### 3.7 Optional Burn-In Video

When `burn_in=True`, the pipeline uses `ffmpeg` to create:

- `<base_name>_subtitled.mp4`

If an SRT file was not requested explicitly, one is generated internally before burn-in.

### 3.8 Optional TTS Dubbing

When `dub=True`, the pipeline:

1. Synthesizes speech per segment with a `TTSProvider`.
2. Aligns generated audio to segment timestamps.
3. Replaces the original video audio track.

The default TTS provider is Edge-TTS.

Expected output:

- `<base_name>_dubbed.mp4`

## 4. Output Contract

`run_subtitle_pipeline(config)` returns a list of created output file paths.

At minimum, when no optional video outputs are requested, it returns subtitle file paths matching `formats`.

`run_subtitle_pipeline_detailed(config)` returns a structured `PipelineResult` with:

- `output_files`: created output file paths.
- `segments`: final transcript or translated segments.
- `provider_metadata`: metadata for providers used during the run.

The detailed function exists for traceability while the original function preserves backward compatibility.

## 5. Non-Goals For Current Version

The current version does not provide:

- Graphical UI.
- Full project history UI.
- Automated job queue runner.
- Subtitle editor.
- Voice conversion.

## 6. Persistent App Configuration

CaptionFlow supports a versioned JSON app configuration through `AppConfig`.

The CLI exposes:

```bash
python -m subtitle_pipeline config show
python -m subtitle_pipeline config init
```

The configuration stores defaults for:

- languages
- output directory
- subtitle formats
- model size and device
- translation provider
- TTS voice and speed
- provider names for transcription, translation and TTS

The default path is:

```text
~/.captionflow/config.json
```

Loading a missing config file returns defaults. Saving creates parent directories.

## 7. Project And Job Records

CaptionFlow supports a minimal project file for future queue and history features.

The CLI exposes:

```bash
python -m subtitle_pipeline project create --name "Demo" --root-dir ./demo
python -m subtitle_pipeline project add-job --project ./demo/captionflow_project.json --input video.mp4
python -m subtitle_pipeline project list --project ./demo/captionflow_project.json
```

Project files are stored as JSON and contain:

- project name and root directory
- jobs
- job status
- output files
- provider metadata
- subtitle draft path when a job has edited subtitles
- error message when a job fails

Supported job states:

- `pending`
- `running`
- `completed`
- `failed`
- `cancelled`

The `run_project_job` orchestrator can execute a job with an injected pipeline runner and records:

- `running`, `completed` and `failed` states
- output files
- provider metadata
- error message on failure
- persistence after state changes when a project path is provided

Jobs can also store edited subtitle drafts:

- `save_job_subtitle_draft(project, job_id, segments)` writes a versioned JSON
  draft under `<project root>/drafts/<job id>.json` by default.
- `load_job_subtitle_draft(project, job_id)` reopens the edited segment list.
- the project record stores `subtitle_draft_path` for traceability.

## 8. Subtitle Editing Domain

CaptionFlow includes a pure subtitle editing module for reviewing generated
segments before export.

Supported operations:

- edit original and translated text
- adjust segment start and end times
- delete segments
- merge two or more consecutive segments
- split one segment into two parts
- normalize segment order by start and end time
- create immutable snapshots for undo/redo layers
- save and load versioned JSON subtitle drafts
- attach subtitle drafts to project jobs

Validation rules:

- start time cannot be negative
- end time must be greater than start time
- duration must meet the configured minimum duration
- original text cannot be empty
- segments cannot overlap the previous segment
- segments must remain ordered by start time

Editing functions return new segment lists and do not mutate the input list.
Invalid editing operations raise `SubtitleEditError`.

Subtitle export validates segments before writing files. Invalid timings,
overlaps or empty original text raise `ExportError` instead of producing a
broken subtitle file.

## 9. Acceptance Criteria

- CLI help can be displayed without loading AI models.
- The `doctor` command can run without loading AI models.
- Formatting functions work without external dependencies.
- Invalid configuration fails before model loading or media processing.
- Existing CLI options remain backward compatible, except removed voice-conversion options.
- Future refactors must preserve the output contract unless this spec is intentionally updated.
- App configuration can be saved and loaded without importing AI model dependencies.
- Project/job records can be saved and loaded without running pipeline work.
- Subtitle editing operations are covered by unit tests and do not require
  provider, model or media dependencies.
