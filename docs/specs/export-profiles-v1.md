# Export Profiles v1 Specification

## 1. Purpose

CaptionFlow should produce subtitle outputs that are easy to upload, review and
archive without requiring a heavy product workflow.

The legacy flat output remains the default for backward compatibility.

## 2. Profiles

| Profile | Output |
| --- | --- |
| `legacy` | Existing flat files: `<base>.<format>` |
| `basic` | Project folder with selected subtitle formats and manifest |
| `youtube` | `.srt`, `.vtt` and manifest using target language naming |
| `review` | `.txt`, bilingual review file and manifest |
| `archive` | Selected subtitle formats, bilingual review file and manifest |

## 3. Folder Layout

Non-legacy profiles write to:

```text
output/
  <safe-base-name>/
    subtitles/
    review/
    metadata/
      export_manifest.json
```

## 4. Manifest

`export_manifest.json` includes:

- profile;
- source and target language;
- generated files;
- validation issue count;
- provider metadata, including cache/fallback state.

## 5. Acceptance Criteria

- Legacy output paths remain unchanged.
- YouTube profile writes `.srt` and `.vtt`.
- Review profile writes a bilingual review text file.
- Manifest records provider metadata.
- Invalid segments still fail before export.
