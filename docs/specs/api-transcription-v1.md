# API Transcription v1 Specification

## 1. Purpose

CaptionFlow can use OpenAI-compatible transcription providers when local
`faster-whisper` is not practical.

## 2. Providers

Supported runtime adapters:

- `openai-whisper`
- `nano-gpt-whisper`

Both use the OpenAI Python SDK style client and request timed segments.

## 3. Behavior

- Default API transcription model is `whisper-1`.
- `OPENAI_API_KEY` is required for `openai-whisper`.
- `NANO_GPT_API_KEY` is required for `nano-gpt-whisper`.
- The provider must return timed segments; untimed plain text is rejected.

## 4. Acceptance Criteria

- Factory creates OpenAI-compatible transcription providers.
- Missing API keys fail during validation.
- Tests use injected clients and do not call the network.
