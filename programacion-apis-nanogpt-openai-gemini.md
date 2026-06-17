# Programacion de las APIs de nano-gpt, OpenAI y Gemini en CaptionFlow

Este documento explica como se ha programado en CaptionFlow la integracion con las APIs de nano-gpt, OpenAI y Gemini, y por que se ha elegido este enfoque. La idea central del proyecto es evitar que el pipeline principal conozca los detalles de cada proveedor. El flujo de subtitulado solo sabe que necesita transcribir, traducir y exportar. Los detalles concretos de credenciales, modelos, endpoints, fallback, dependencias y formatos de respuesta quedan encapsulados en una capa de providers.

CaptionFlow trabaja con video o audio, extrae una pista WAV temporal, la transcribe en segmentos, traduce esos segmentos si los idiomas son distintos y finalmente exporta subtitulos. Las APIs externas aparecen sobre todo en dos puntos: transcripcion remota y traduccion remota. En vez de llamar directamente a nano-gpt, OpenAI o Gemini desde `pipeline.py`, el codigo define contratos comunes en `subtitle_pipeline/providers/contracts.py`.

Ese archivo introduce tres piezas clave:

- `ProviderConfig`: contiene nombre del provider, tarea, modelo, variable de entorno de API key, `base_url`, fallback y opciones.
- `ProviderCapabilities`: describe que sabe hacer cada provider, si requiere red, si requiere clave, que paquete Python usa, idiomas soportados y nivel de privacidad.
- `ProviderResultMetadata`: acompana cada resultado con provider real, modelo, `base_url`, si se uso fallback, si vino de cache y avisos.

Esto permite que el resto de la aplicacion trate todos los proveedores como adaptadores intercambiables. El pipeline no se acopla a nano-gpt ni a Gemini, sino a la interfaz `TranslationProvider` o `TranscriptionProvider`.

## Registro de providers

El archivo `subtitle_pipeline/providers/registry.py` actua como catalogo central. Aqui se registran `nano-gpt`, `openai`, `gemini`, `nano-gpt-whisper`, `openai-whisper`, ademas de providers locales o legacy como `faster-whisper`, `nllb` y `claude`.

Para nano-gpt se define:

```python
api_key_env_var="NANO_GPT_API_KEY"
base_url="https://nano-gpt.com/api/v1"
privacy_level="api_cloud"
package="openai"
```

La peculiaridad es que nano-gpt se programa usando el SDK de OpenAI. No porque sea OpenAI, sino porque expone una API compatible. La diferencia real se concentra en `base_url`. OpenAI usa el endpoint por defecto del SDK, mientras nano-gpt usa `https://nano-gpt.com/api/v1`.

Gemini, en cambio, no sigue el mismo protocolo en este codigo. Se registra con `package="google.genai"` y `api_key_env_var="GEMINI_API_KEY"`. Por eso necesita un adaptador especifico.

## Cliente OpenAI-compatible

La clase `OpenAICompatibleClient`, en `subtitle_pipeline/providers/openai_compatible.py`, es la pieza que unifica nano-gpt y OpenAI. En el constructor toma una variable de entorno, una API key opcional y un `base_url` opcional. Si `base_url` viene informado, el SDK se inicializa contra ese endpoint. Si no, se usa OpenAI normal. La traduccion usa `client.chat.completions.create(...)` con `model`, `messages`, `max_tokens` y `temperature`, y normaliza la respuesta a un `ChatCompletionResult` sencillo. Asi las clases superiores no dependen de la estructura exacta del SDK.

Para transcripcion OpenAI-compatible se usa `client.audio.transcriptions.create(...)` con `response_format="verbose_json"`. Esta parte espera que el proveedor devuelva segmentos con `start`, `end` y `text`. Ese requisito encaja con OpenAI Whisper, pero no siempre con nano-gpt Whisper, y por eso existe una excepcion importante.

## Peculiaridad de nano-gpt Whisper

Aunque nano-gpt sea OpenAI-compatible para muchas llamadas, su endpoint de Whisper puede devolver estructuras distintas. Por ese motivo se implemento `NanoGPTWhisperClient`, separado de `OpenAICompatibleClient`.

La decision practica fue no forzar `response_format="verbose_json"` en nano-gpt Whisper. El codigo deja que nano-gpt responda en su formato nativo y despues intenta extraer texto con `_extract_nanogpt_transcript_text`. Esa funcion acepta `text`, `transcription`, `result`, `result.text` y `segments[].text`.

Si ninguna forma encaja, lanza un error explicito con las claves disponibles. Esto es muy replicable: cuando una API compatible no es perfectamente identica, no conviene llenar el pipeline de condiciones. Conviene crear un adaptador especifico que traduzca la respuesta irregular al modelo interno.

Como nano-gpt Whisper puede no devolver tiempos por segmento, el adaptador devuelve un unico `Segment(start=0.0, end=0.0, text=...)`. Es una limitacion consciente: se conserva el transcript y se informa dentro del contrato comun, aunque no haya granularidad temporal.

## Provider de traduccion OpenAI-compatible

`OpenAICompatibleTranslationProvider` sirve tanto para `nano-gpt` como para `openai`. Recibe `provider_name`, idiomas, modelo opcional, API key, cliente inyectable, glosario y parametros de generacion.

Su patron es: obtiene capacidades desde el registro, construye un `ProviderConfig`, crea el cliente solo cuando se necesita, convierte los segmentos a un prompt numerado, exige que la respuesta vuelva con el mismo numero de lineas y reconstruye los `Segment` conservando `start`, `end` y texto original.

El prompt esta disenado para subtitulos: "Translate numbered subtitle lines. Preserve numbering, segment count, meaning, names and timing." Luego `_build_translation_prompt` genera lineas como `1. Hello`. La respuesta se parsea con `_parse_numbered_lines`. Si el proveedor devuelve menos o mas lineas, se lanza `TranslationError`.

Este enfoque se eligio porque los subtitulos no son texto libre. Si el modelo junta dos frases o elimina una, se rompen los tiempos. Numerar segmentos es una tecnica simple, pero muy efectiva, para mantener alineacion.

Los modelos por defecto estan en funciones pequenas: `nano-gpt` usa `qwen/qwen3.5-397b-a17b` y `openai` usa `gpt-4o-mini`. El usuario puede sobreescribirlos desde configuracion, CLI o UI.

Gemini se implementa en el mismo archivo, pero con clase propia: `GeminiTranslationProvider`. Usa `google-genai`, inicializa `genai.Client(api_key=key)` y llama a `client.models.generate_content`.

Aunque el SDK y el metodo son distintos, el provider replica la misma arquitectura de prompt numerado que nano-gpt y OpenAI. La instruccion de sistema se pasa como `system_instruction` dentro de `types.GenerateContentConfig`, y el prompt de usuario se construye con `_build_translation_prompt`.

La decision clave es que Gemini no comparte cliente, pero si comparte contrato, prompt y parser. Asi, cambiar de OpenAI a Gemini no cambia el resultado esperado por el pipeline.

`subtitle_pipeline/providers/factories.py` convierte la configuracion de usuario en objetos reales. Si el provider de traduccion es `nano-gpt` u `openai`, devuelve `OpenAICompatibleTranslationProvider`. Si es `gemini`, devuelve `GeminiTranslationProvider`.

En transcripcion hay una peculiaridad adicional: `SubtitleConfig` hereda `large-v3` como modelo por defecto para `faster-whisper`. Ese valor no es valido para los providers cloud `nano-gpt-whisper` y `openai-whisper`, asi que la factory lo resetea a `None` para que cada provider use su default real, normalmente `whisper-1`.

`validation.py` valida antes de ejecutar: provider soportado, idiomas soportados y API key presente cuando hace falta. Esto evita fallos tardios dentro de una llamada remota.

El fallback se gestiona en `ProviderRouter`. El router recibe un provider primario y opcionalmente uno de fallback. Primero comprueba disponibilidad. Si falta una key o una dependencia y hay fallback, usa el fallback. Si el provider primario falla con `ProviderRuntimeError`, tambien cambia al fallback. Ademas modifica los metadatos para dejar claro el `requested_provider`, el provider real y `fallback_used=True`.

## Cache, UI y modelos dinamicos

La cache de traduccion esta en `subtitle_pipeline/cache.py`. La clave se calcula con hash SHA-256 sobre provider, modelo, `base_url`, opciones, idiomas y textos originales. Esto evita pagar dos veces por la misma traduccion y, al incluir modelo y proveedor, impide mezclar resultados de APIs distintas.

La API local (`local_api.py`) expone providers, claves y modelos al frontend. Para nano-gpt no hay lista estatica: si existe `NANO_GPT_API_KEY`, llama a endpoints vivos de nano-gpt para listar modelos. Para Gemini intenta listar modelos con `google-genai` y cae a una lista estatica si no puede. OpenAI mantiene una lista curada.

La UI no llama directamente a proveedores externos. Guarda claves en `.env` a traves del backend local y ejecuta jobs enviando solo la configuracion. Esto reduce exposicion de claves en el navegador y mantiene toda la logica sensible en Python.

## Como replicarlo en otra aplicacion

Para replicar este enfoque:

1. Define contratos internos independientes del proveedor: config, capabilities, result metadata y protocolos de ejecucion.
2. Crea un registro unico de providers con API key env var, paquete requerido, `base_url`, idiomas y privacidad.
3. Si dos APIs comparten protocolo, usa un cliente comun parametrizado por `base_url`.
4. Si una API es parecida pero devuelve formatos distintos, crea un adaptador especifico que normalice su salida.
5. Haz que el pipeline dependa de providers, no de SDKs.
6. Centraliza la creacion en factories.
7. Valida credenciales y dependencias antes de ejecutar.
8. Anade fallback con metadatos claros.
9. Cachea llamadas deterministas usando provider, modelo, opciones e input como parte de la clave.
10. Escribe tests con clientes fake para no depender de red ni gastar creditos.

El resultado es una integracion flexible: nano-gpt y OpenAI comparten SDK, Gemini usa SDK propio, pero los tres entregan el mismo tipo de resultado al resto de CaptionFlow.
