# Provider Router v2 Specification

## 1. Purpose

`ProviderRouter` will execute AI tasks through a primary provider and, when
allowed, retry with a configured fallback provider.

It must keep the pipeline independent from specific vendors such as nano-gpt,
OpenAI, Claude, NLLB, faster-whisper or Edge-TTS.

## 2. Scope

Supported task types:

- transcription
- translation
- TTS

Initial runtime providers:

- existing adapters: `faster-whisper`, `claude`, `nllb`, `edge-tts`
- upcoming adapters: `nano-gpt`, `openai`, `nano-gpt-whisper`,
  `openai-whisper`, `openai-tts`

## 3. Inputs

The router receives:

- task name;
- primary `ProviderConfig`;
- optional fallback `ProviderConfig`;
- provider factory/registry;
- operation callable;
- optional cache;
- optional event sink.

Provider configuration may include:

- provider name;
- model;
- base URL;
- API key environment variable;
- fallback provider;
- fallback model;
- provider-specific options.

## 4. Expected Behavior

1. Validate that the primary provider is registered for the requested task.
2. Validate dependency and credential availability before execution when
   possible.
3. Execute the primary provider.
4. If the provider raises a recoverable provider/runtime error and fallback is
   configured, execute the fallback provider.
5. Do not fallback for configuration errors, unsupported provider errors, bad
   input data or validation failures.
6. Return the provider result with metadata describing the actual provider used.
7. Emit progress events when fallback starts or succeeds.

## 5. Metadata Requirements

Every routed result must be able to record:

- requested provider;
- actual provider;
- model;
- task;
- base URL when applicable;
- privacy level;
- whether fallback was used;
- whether cache was used;
- estimated cost;
- warnings.

## 6. Cache Contract

The router may consult a cache only for deterministic API operations.

Cache keys must include:

- task;
- provider;
- model;
- normalized input hash;
- relevant options.

Cache entries must not include API keys.

## 7. Error Policy

Recoverable errors:

- transient network failures;
- provider rate limits;
- provider server errors;
- timeout errors.

Non-recoverable errors:

- invalid configuration;
- missing input file;
- unsupported language;
- unsupported provider;
- malformed local data;
- missing required credentials for both primary and fallback.

## 8. Acceptance Criteria

- Unit tests prove primary provider success.
- Unit tests prove fallback on recoverable provider error.
- Unit tests prove no fallback on configuration error.
- Metadata records `fallback_used=True` only when fallback really executed.
- Pipeline code does not branch on concrete vendor names.
- Tests use fake providers and perform no network calls.
