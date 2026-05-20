# Translation Cache v1 Specification

## 1. Purpose

CaptionFlow may reuse deterministic translation results to reduce API cost,
avoid repeated provider calls and make repeated runs more reproducible.

The cache is optional and disabled by default.

## 2. Scope

Included:

- text translation segment results;
- provider/model/source/target aware cache keys;
- JSON cache entries;
- `cache_hit` metadata in provider results.

Excluded for now:

- raw audio cache;
- transcription cache;
- TTS audio cache;
- TTL and cache cleanup CLI.

## 3. Key Material

The cache key is a SHA-256 hash over:

- cache schema version;
- provider name;
- provider model;
- provider base URL;
- source language;
- target language;
- segment start/end/text.

API keys and secrets must never be written into keys or cache payloads.

## 4. Storage

Default path:

```text
~/.captionflow/cache
```

Each entry is a JSON file named `<cache-key>.json`.

## 5. Pipeline Behavior

When `translation_cache_enabled` is true:

1. Build cache keys for the primary provider and optional fallback provider.
2. Return a cached `TranslationResult` when a matching entry exists.
3. Set `ProviderResultMetadata.cache_hit=True`.
4. If no entry exists, execute the provider route normally.
5. Store the translated segments under the actual provider/model that produced
   the result.

When `translation_cache_enabled` is false, behavior must remain unchanged.

## 6. Acceptance Criteria

- Cache hit returns translated segments without creating the provider.
- Cache miss executes the provider and stores the result.
- Corrupt cache entries are ignored.
- Tests verify hit/miss behavior.
- `pytest` and `ruff` pass.
