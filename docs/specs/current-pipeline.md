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

Expected behavior:

- Missing required runtime dependencies are reported as `FAIL`.
- Missing optional credentials are reported as `WARN`.
- The command exits with code `1` when at least one check fails.
- The command exits with code `0` when there are only passing checks or warnings.

### 3.2 Validate Configuration

The pipeline should fail before starting long-running work when:

- The input file does not exist.
- `output_dir` points to an existing file.
- Any requested subtitle format is unsupported.
- The translator is unsupported.
- The device value is unsupported.
- `tts_rate` is outside the supported range.
- Claude translation is requested between different languages and no API key is available.

### 3.3 Extract Audio

The pipeline extracts a mono WAV file at 16 kHz using `ffmpeg`.

Expected behavior:

- Input media is read from `input_path`.
- Temporary audio is written into a temporary working directory.
- Temporary files are removed at the end of the run.

### 3.4 Transcribe

The pipeline uses `faster-whisper` to produce ordered transcript segments.

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

1. Synthesizes speech per segment with Edge-TTS.
2. Aligns generated audio to segment timestamps.
3. Replaces the original video audio track.

Expected output:

- `<base_name>_dubbed.mp4`

## 4. Output Contract

`run_subtitle_pipeline(config)` returns a list of created output file paths.

At minimum, when no optional video outputs are requested, it returns subtitle file paths matching `formats`.

## 5. Non-Goals For Current Version

The current version does not provide:

- Graphical UI.
- Project history.
- Job queue.
- Subtitle editor.
- Provider registry.
- Multiple interchangeable model providers through formal contracts.
- Voice conversion.

## 6. Acceptance Criteria

- CLI help can be displayed without loading AI models.
- The `doctor` command can run without loading AI models.
- Formatting functions work without external dependencies.
- Invalid configuration fails before model loading or media processing.
- Existing CLI options remain backward compatible, except removed voice-conversion options.
- Future refactors must preserve the output contract unless this spec is intentionally updated.
