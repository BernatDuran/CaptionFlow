# Subtitle CLI v1 Specification

## 1. Purpose

CaptionFlow needs a practical way to review and correct subtitle drafts without
requiring a graphical interface.

This CLI works on draft JSON files produced by the subtitle editor domain.

## 2. Commands

All commands are under:

```bash
python -m subtitle_pipeline subtitle <command>
```

Supported commands:

| Command | Purpose |
| --- | --- |
| `list` | Print draft segments with 1-based indexes |
| `validate` | Report timing/text issues |
| `edit` | Edit original and/or translated text |
| `shift` | Update start/end time for one segment |
| `delete` | Delete one segment |
| `merge` | Merge a segment range |
| `split` | Split one segment into two |
| `normalize` | Sort segments by timing |

## 3. Indexing

CLI indexes are 1-based to be comfortable for manual use. Internally they are
converted to the editor domain's 0-based indexes.

## 4. Persistence

Mutation commands save in place by default. `--output` writes the edited draft to
a different path.

## 5. Acceptance Criteria

- Commands operate on draft JSON files.
- `validate` exits with code `1` when validation issues exist.
- Domain errors exit with code `2`.
- Tests cover list, validate, edit and merge behavior.
