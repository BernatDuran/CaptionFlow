# Project Flow v1 Specification

## 1. Purpose

CaptionFlow should support a simple personal workflow:

```text
create project -> add job -> run job -> edit draft -> export final files
```

This is intentionally lightweight and file-based.

## 2. Commands

```bash
python -m subtitle_pipeline project create --name Demo --root-dir ./demo
python -m subtitle_pipeline project add-job --project ./demo/captionflow_project.json --input video.mp4
python -m subtitle_pipeline project run --project ./demo/captionflow_project.json --job-id <id>
python -m subtitle_pipeline subtitle edit --draft ./demo/drafts/<id>.json --index 1 --translated "..."
python -m subtitle_pipeline project export --project ./demo/captionflow_project.json --job-id <id>
```

## 3. Behavior

- `project run` executes the pipeline for a job input path.
- Completed jobs persist output files, provider metadata and an editable subtitle
  draft.
- `project export` reads the saved draft and generates final outputs through an
  export profile.
- The project JSON remains the source of truth.

## 4. Acceptance Criteria

- Jobs move to `completed` after successful run.
- Failed jobs persist the error message.
- Successful runs save a subtitle draft path.
- Exporting from a draft updates job output files.
- Tests cover run and export CLI behavior.
