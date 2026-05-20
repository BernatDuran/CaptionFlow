# Translation Glossary v1 Specification

## 1. Purpose

CaptionFlow can guide translation providers with a small personal glossary for
names, brands and technical terms that should remain consistent.

## 2. Format

Supported JSON formats:

```json
{
  "CaptionFlow": "CaptionFlow",
  "voice over": "doblaje"
}
```

or:

```json
[
  {"source": "render", "target": "exportar"}
]
```

## 3. Behavior

- `translation_glossary_path` points to the glossary JSON file.
- CLI flag: `--translation-glossary`.
- OpenAI-compatible translation providers add the glossary to the prompt.
- Cache keys include provider options, so changing glossary content changes the
  translation cache key.

## 4. Acceptance Criteria

- Missing or invalid glossary files fail during config validation.
- Prompt-based providers include glossary terms.
- Tests cover mapping and list glossary formats.
