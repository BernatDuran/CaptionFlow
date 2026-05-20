# Planificacion Maestra v2 de CaptionFlow

> Documento rector del desarrollo a partir de la propuesta v2.
> Sustituye a `docs/planificacion-mejoras.md` como referencia principal.
> Basado en el codigo actual, `docs/specs/current-pipeline.md` y
> `docs/cambios-propuestos-v2.md`.

## 1. Proposito del Documento

Este documento define el estado real de CaptionFlow, el objetivo final de la
aplicacion y el plan tecnico-funcional para evolucionarla siguiendo
spec-driven development, buenas practicas de ingenieria y control estricto de
dependencias.

Quien lea este documento debe entender:

- de donde viene el proyecto;
- que se ha implementado hasta ahora;
- cual es el cambio estrategico introducido por la propuesta v2;
- que refactors y nuevas capacidades faltan;
- en que orden deben implementarse para no romper la base actual.

## 2. Vision del Producto

CaptionFlow debe convertirse en una aplicacion local-first para procesar
contenido audiovisual:

1. importar video o audio;
2. transcribir;
3. traducir;
4. editar subtitulos;
5. previsualizar;
6. exportar subtitulos, audio doblado y video final;
7. gestionar proyectos, historial, costes, privacidad y proveedores.

La nueva direccion v2 no persigue solo "anadir mas modelos". Persigue una
arquitectura mas flexible, instalable, observable y barata de operar:

- **local-first** cuando sea posible;
- **API fallback** cuando mejore coste, velocidad o calidad;
- **providers intercambiables** por tarea;
- **dependencias pesadas opcionales**;
- **coste y privacidad visibles** antes y despues de ejecutar un job;
- **cache local de respuestas API** para reducir gasto y repeticiones;
- **UI futura construida sobre contratos estables**, no sobre scripts.

## 3. De Donde Venimos

El repositorio original era un pipeline Python orientado a consola:

- extraccion de audio con `ffmpeg`;
- transcripcion con `faster-whisper`;
- traduccion con Claude o NLLB;
- exportacion `srt`, `vtt`, `txt`;
- subtitulos quemados;
- doblaje TTS con Edge-TTS;
- referencias RVC/Applio que dependian de instalacion externa.

Primera decision importante ya ejecutada:

- se elimino RVC/Applio porque introducia dependencia externa no controlada,
  modelos entrenados fuera de la app y una superficie funcional no alineada con
  el objetivo actual.

## 4. Estado Real Actual del Codigo

### 4.1 Base Implementada

| Area | Estado | Evidencia |
| --- | --- | --- |
| Limpieza RVC/Applio | Hecho | RVC eliminado del flujo de app |
| Tests y lint | Hecho | Suite pytest y ruff activos |
| Especificacion actual | Hecho | `docs/specs/current-pipeline.md` |
| Configuracion persistente | Hecho | `app_config.py`, CLI `config` |
| Diagnostico | Hecho | `doctor.py` con perfiles opcionales |
| Dependencias opcionales | Hecho inicial | extras en `pyproject.toml`, imports perezosos |
| Providers internos | Hecho inicial | contratos, registry, factories, adapters |
| Provider/modelo por tarea | Hecho inicial | `SubtitleConfig`, CLI provider flags |
| Proyectos y jobs | Hecho inicial | `projects.py`, `job_runner.py` |
| Eventos de progreso | Hecho inicial | `progress.py`, `PipelineEvent`, `EventSink` |
| Editor de subtitulos dominio | Hecho inicial | `subtitle_editor.py` |
| Drafts por job | Hecho inicial | `save_job_subtitle_draft`, `load_job_subtitle_draft` |
| Validacion antes de exportar | Hecho inicial | `write_subtitles` valida segmentos |

### 4.2 Limitaciones Actuales

| Area | Limitacion |
| --- | --- |
| Providers API v2 | Aun no existen nano-gpt ni OpenAI como adaptadores reales |
| ProviderRouter | No existe fallback automatico por tarea |
| Cache API | No existe cache local de respuestas |
| Costes | `ProviderResultMetadata.estimated_cost` existe, pero no se calcula |
| Privacidad | No hay `privacy_level` formal en capabilities/metadatos |
| Dependencias | Se han separado por extras, pero `requirements.txt` aun representa perfil completo legacy |
| Traduccion robusta | Claude/NLLB actuales no garantizan cardinalidad estricta ante respuestas malformadas |
| Export profesional | Solo `srt`, `vtt`, `txt`; no hay perfiles YouTube/Premiere/DaVinci/CapCut |
| UI | No existe interfaz visual ni API interna para frontend |
| Cola real | Hay jobs y eventos, pero no scheduler/runner persistente avanzado |

## 5. Cambio Estrategico v2

La propuesta v2 reorienta CaptionFlow hacia:

**Local-first con API fallback.**

Esto significa:

- transcripcion local con `faster-whisper` como opcion principal cuando este
  disponible;
- transcripcion API como fallback;
- traduccion API barata y de calidad con nano-gpt/Qwen como opcion recomendada;
- OpenAI como fallback compatible mediante el mismo SDK;
- Edge-TTS como TTS gratuito/opcional;
- OpenAI TTS como fallback de calidad;
- NLLB deja de ser obligatorio y queda como opcion local avanzada;
- Claude deja de ser proveedor estrategico por defecto y pasa a legacy/opcional.

### 5.1 Opinion Tecnica Sobre el Cambio

El planteamiento v2 es bueno y va en la direccion correcta, pero debe aplicarse
con disciplina. Es una mejora grande en dependencias, flexibilidad y
escalabilidad, pero tambien introduce riesgos nuevos:

- depender de nano-gpt como proveedor recomendado exige fallback real, no solo
  configuracion declarativa;
- usar un SDK comun (`openai`) simplifica mucho, pero crea un punto sensible si
  el SDK cambia;
- las estimaciones de coste deben tratarse como aproximadas y versionadas;
- cachear respuestas API ayuda, pero requiere privacidad, invalidacion y
  trazabilidad;
- eliminar NLLB como obligatorio es positivo, pero conviene mantenerlo como
  provider opcional para casos sin red.

Mi recomendacion: adoptar v2, pero no como refactor masivo de golpe. Debe
implementarse por fases verticales, manteniendo tests verdes y compatibilidad
CLI en cada paso.

## 6. Principios de Ingenieria

1. **Spec antes de codigo**: cada provider, router, cache o export profile debe
   tener contrato documentado antes de implementarse.
2. **Compatibilidad gradual**: `translator`, `model_size`, Claude y NLLB se
   deprecian progresivamente, no se eliminan sin migracion.
3. **Dependencias opcionales reales**: importar CLI, config, proyectos y editor
   no debe cargar IA, audio pesado ni SDKs remotos.
4. **Providers tras contratos**: el pipeline no debe saber si un provider es
   nano-gpt, OpenAI, faster-whisper, NLLB o Edge-TTS.
5. **Fallback observable**: si un provider falla y se usa otro, debe quedar
   registrado en eventos, metadatos y job.
6. **Coste y privacidad trazables**: cada resultado API debe indicar provider,
   modelo, base URL, coste estimado y nivel de privacidad.
7. **Tests con dobles por defecto**: nada de llamadas remotas en tests unitarios.
8. **Errores de dominio**: no propagar errores crudos de SDK/subprocess cuando
   el usuario necesita accion concreta.
9. **Refactor por capas**: dominio, casos de uso, providers, infraestructura,
   CLI/UI y persistencia deben evolucionar separados.
10. **UI despues de API interna**: no construir interfaz sobre funciones
    acopladas a consola.

## 7. Arquitectura Objetivo v2

### 7.1 Capas

| Capa | Responsabilidad |
| --- | --- |
| Dominio | Segmentos, documentos de subtitulos, proyectos, jobs, perfiles de exportacion |
| Casos de uso | Transcribir, traducir, editar, exportar, doblar, validar, estimar coste |
| Providers | Adaptadores IA y media detras de contratos |
| Router | Seleccion primaria, fallback, errores, coste, privacidad |
| Infraestructura | cache, filesystem, eventos, logs, diagnostico, configuracion |
| Interfaces | CLI, futura API local, futura UI |

### 7.2 Providers Objetivo

| Tarea | Primario recomendado | Fallback | Opcional/local |
| --- | --- | --- | --- |
| Transcripcion | `faster-whisper` local | nano-gpt/OpenAI Whisper API | whisper.cpp futuro |
| Traduccion | nano-gpt/Qwen | OpenAI Chat | NLLB legacy/opcional |
| TTS | Edge-TTS | OpenAI TTS | motores locales futuros |

### 7.3 Componentes Nuevos Necesarios

| Componente | Objetivo |
| --- | --- |
| `providers/router.py` | Ejecutar provider primario y fallback automatico |
| `providers/openai_client.py` | Crear clientes OpenAI-compatible para OpenAI y nano-gpt |
| `providers/nanogpt_translation.py` | Traduccion Qwen via nano-gpt |
| `providers/openai_translation.py` | Traduccion via OpenAI |
| `providers/nanogpt_whisper.py` | Transcripcion Whisper via nano-gpt |
| `providers/openai_whisper.py` | Transcripcion Whisper via OpenAI |
| `providers/openai_tts.py` | TTS via OpenAI |
| `cache.py` | Cache local para respuestas API |
| `costing.py` | Estimacion de coste por provider/modelo |
| `privacy.py` | Niveles `local`, `api_cloud`, `hybrid` |
| `config/defaults.py` o `config/default.yaml` | Defaults versionados y fallback chains |

## 8. Brecha Entre Codigo Actual y Objetivo v2

| Tema | Codigo actual | Objetivo v2 | Accion |
| --- | --- | --- | --- |
| SDK API | `anthropic` opcional para Claude | `openai` como SDK comun | Introducir extra `api`, adapters OpenAI-compatible |
| Traduccion default | Claude | nano-gpt/Qwen | Cambiar defaults con deprecacion |
| Traduccion local | NLLB opcional | NLLB legacy/opcional | Mantener, no bloquear instalacion |
| Router | No existe | fallback automatico | Crear `ProviderRouter` |
| ProviderConfig | nombre, tarea, modelo, options | base_url, api_key_env, fallback, privacy | Expandir contratos |
| ProviderCapabilities | basico | coste, privacidad, red, local/API | Expandir capacidades |
| Metadata | provider/model/task/coste opcional | coste calculado, fallback, base_url, cache_hit | Expandir |
| Cache | No existe | cache API local | Crear cache versionada |
| Doctor | paquetes/env basicos | API keys, perfiles, provider availability | Ampliar |
| CLI | provider/model flags basicos | fallback, privacy, cost estimate | Ampliar gradual |
| UI | No existe | UI local | Despues de API interna |

## 9. Roadmap Rector v2

### Fase A: Consolidacion Documental y Contratos v2

Objetivo: cerrar la especificacion v2 antes de tocar providers reales.

Entregables:

- este documento como roadmap principal;
- deprecacion de `planificacion-mejoras.md`;
- ADR breve para decision local-first + API fallback;
- especificacion de `ProviderRouter`;
- especificacion de cache API;
- especificacion de coste/privacidad.

Criterios de aceptacion:

- docs no se contradicen;
- el codigo actual queda mapeado contra el objetivo;
- todo nuevo trabajo tiene contratos claros.

### Fase B: Dependencias y Configuracion v2

Objetivo: adaptar dependencias al modelo OpenAI-compatible sin romper lo actual.

Cambios tecnicos:

- anadir extra `api = ["openai>=1.30.0"]`;
- mover `anthropic` a extra `legacy-claude`;
- mantener `translation-local` para NLLB;
- decidir si `requirements.txt` sigue siendo full legacy o se sustituye por
  perfil recomendado;
- anadir variables `NANO_GPT_API_KEY` y `OPENAI_API_KEY` al doctor;
- actualizar `AppConfig` con fallback chains.

Criterios:

- CLI/config/editor importan sin SDKs pesados;
- tests siguen sin red;
- doctor distingue provider disponible, key ausente y dependencia ausente.

### Fase C: Contratos Provider v2

Objetivo: ampliar contratos antes de implementar adapters.

Cambios tecnicos:

- ampliar `ProviderConfig`:
  - `base_url`;
  - `api_key_env_var`;
  - `fallback_provider`;
  - `fallback_model`;
  - `options`;
- ampliar `ProviderCapabilities`:
  - `privacy_level`;
  - `estimated_unit_cost`;
  - `supports_streaming` si aplica;
  - `supports_fallback`;
- ampliar `ProviderResultMetadata`:
  - `base_url`;
  - `api_provider`;
  - `fallback_used`;
  - `cache_hit`;
  - `estimated_cost`;
  - `warnings`.

Criterios:

- tests de contratos actualizados;
- adapters actuales siguen funcionando;
- metadata antigua no rompe consumidores.

### Fase D: ProviderRouter y Fallback

Objetivo: centralizar seleccion primaria/fallback sin ensuciar pipeline.

Cambios tecnicos:

- crear `providers/router.py`;
- soportar fallback por tarea;
- convertir errores de provider a errores propios;
- emitir eventos cuando se usa fallback;
- registrar provider real usado en metadata.

Criterios:

- test de provider primario correcto;
- test de fallback ante error recuperable;
- test de no fallback ante error de configuracion;
- pipeline no contiene logica especifica de nano-gpt/OpenAI.

### Fase E: Adaptadores OpenAI-Compatible

Objetivo: implementar nano-gpt y OpenAI con un cliente comun.

Orden recomendado:

1. `OpenAICompatibleClientFactory`.
2. `NanoGPTTranslationProvider`.
3. `OpenAITranslationProvider`.
4. `OpenAITTSProvider`.
5. `NanoGPTWhisperProvider`.
6. `OpenAIWhisperProvider`.

Criterios:

- sin llamadas reales en unit tests;
- mocks del SDK;
- cardinalidad de traduccion garantizada;
- errores normalizados;
- coste aproximado registrado cuando exista usage.

### Fase F: Cache API y Costing

Objetivo: reducir coste y mejorar reproducibilidad.

Cambios tecnicos:

- crear cache JSON versionada en `~/.captionflow/cache`;
- key por hash de provider, modelo, input normalizado y parametros;
- TTL configurable;
- metadata `cache_hit`;
- no cachear audio crudo salvo decision explicita;
- limpiar cache por CLI futura.

Criterios:

- test cache hit/miss;
- test expiracion;
- test no fuga de API keys;
- coste estimado no se duplica en cache hit.

### Fase G: Migracion de Defaults

Objetivo: cambiar defaults sin romper usuarios actuales.

Defaults propuestos:

| Tarea | Default v2 |
| --- | --- |
| Transcripcion | `faster-whisper`, fallback API |
| Traduccion | `nano-gpt`, fallback `openai` |
| TTS | `edge-tts`, fallback `openai` |

Compatibilidad:

- `translator=claude` se mantiene como legacy;
- `translation_provider=claude` se mantiene si `legacy-claude` instalado;
- `nllb` se mantiene como `translation-local`;
- se documenta deprecacion, no se elimina de golpe.

### Fase H: Exportacion Profesional

Objetivo: mejorar utilidad real de salida.

Entregables:

- `ExportProfile`;
- perfiles YouTube, TikTok, Premiere, DaVinci, CapCut;
- formato `ass`;
- nombres de archivo consistentes;
- validaciones por perfil;
- tests snapshot.

### Fase I: API Interna y UI Local

Objetivo: preparar uso sin consola.

Orden:

1. API interna para proyectos, jobs, config, providers, drafts, exports.
2. UI minima local.
3. progreso por eventos.
4. editor visual basico.
5. previsualizacion de video.

Criterios:

- la UI no llama providers directamente;
- la UI consume casos de uso/API interna;
- tareas largas no bloquean interfaz;
- errores y coste/privacidad son visibles.

### Fase J: Traduccion Robusta y Glosarios

Objetivo: calidad profesional.

Entregables:

- glosarios por proyecto;
- parser robusto estructurado;
- cardinalidad estricta;
- retry con backoff;
- fallback controlado;
- comparacion original/traduccion.

### Fase K: Doblaje TTS Mejorado

Objetivo: doblaje mas natural y controlable.

Entregables:

- selector de voces;
- OpenAI TTS;
- control velocidad/pausas/volumen;
- pista doblada separada;
- mezcla configurable;
- duracion por segmento.

### Fase L: Endurecimiento y Distribucion

Objetivo: app usable de forma recurrente.

Entregables:

- CI completo;
- type checking;
- fixtures pequenas de integracion;
- versionado semantico;
- changelog;
- guia instalacion/troubleshooting;
- empaquetado o instalador si procede.

## 10. Estado de Avance v2

| Area | Cumplimiento | Estado |
| --- | ---: | --- |
| Base tecnica y tests | 80% | Hecho inicial, falta CI/type check |
| Dependencias opcionales | 55% | Extras creados, falta reorientar a OpenAI SDK v2 |
| Provider-ready | 60% | Contratos base hechos, falta router/fallback/coste/privacy |
| Proyectos/jobs | 45% | Persistencia JSON y eventos, falta cola real/cache/logs |
| Editor subtitulos | 60% | Dominio y drafts hechos, falta UI/undo-redo completo |
| Exportacion profesional | 0% | Pendiente |
| Traduccion robusta | 25% | Providers base, falta nano-gpt/OpenAI/glosarios/cardinalidad |
| Doblaje TTS | 30% | Base Edge-TTS, falta OpenAI TTS y controles avanzados |
| API interna/UI | 0% | Pendiente |
| Distribucion | 20% | Extras/docs iniciales, falta release/CI/instalador |

## 11. Backlog Priorizado v2

| Prioridad | Bloque | Motivo |
| ---: | --- | --- |
| 1 | Contratos v2 de providers, coste y privacidad | Base para todo el cambio |
| 2 | Dependencias v2 con `openai` SDK y legacy extras | Reduce complejidad real |
| 3 | ProviderRouter con fallback | Convierte provider-ready en resiliencia real |
| 4 | nano-gpt/OpenAI translation providers | Mayor impacto funcional/coste |
| 5 | Cache API | Ahorro y reproducibilidad |
| 6 | OpenAI TTS | Mejora clara en doblaje |
| 7 | Whisper API fallback | Resiliencia para equipos sin entorno local |
| 8 | ExportProfile y exportacion profesional | Valor practico inmediato |
| 9 | API interna local | Base de UI |
| 10 | UI local y previsualizacion | Usabilidad final |
| 11 | Glosarios/traduccion robusta | Calidad profesional |
| 12 | Distribucion completa | Producto final usable |

## 12. Documentos y Estado

| Documento | Estado | Uso |
| --- | --- | --- |
| `docs/planificacion-maestra-v2.md` | Principal | Roadmap rector desde ahora |
| `docs/planificacion-mejoras.md` | Deprecado | Mantener solo como referencia historica |
| `docs/cambios-propuestos-v2.md` | Fuente de propuesta | Documento de cambio estrategico |
| `docs/specs/current-pipeline.md` | Spec actual | Contrato de comportamiento implementado hoy |

## 13. Reglas Antes de Implementar Cada Fase

Antes de empezar una fase:

1. actualizar o crear spec concreta;
2. identificar archivos afectados;
3. definir criterios de aceptacion;
4. escribir tests unitarios con dobles;
5. implementar incrementalmente;
6. ejecutar `pytest` y `ruff`;
7. actualizar este documento si cambia el rumbo;
8. mantener compatibilidad o documentar deprecacion.

## 14. Primera Accion Recomendada

No empezar por UI ni exportacion profesional todavia.

La siguiente accion correcta es:

1. ampliar contratos provider v2;
2. anadir `openai` como extra API;
3. introducir `privacy_level`, `base_url`, `api_key_env_var` y metadata ampliada;
4. crear spec de `ProviderRouter`;
5. implementar router con tests y providers falsos.

Esto reduce riesgo y prepara el cambio grande sin romper el pipeline actual.

Estado de esta primera accion:

- `ProviderConfig`, `ProviderCapabilities` y `ProviderResultMetadata` ya estan
  preparados para `base_url`, `api_key_env_var`, privacidad, cache y fallback.
- El registry ya declara providers v2 de nano-gpt/OpenAI como capacidades.
- `docs/specs/provider-router-v2.md` define el contrato antes de implementar el
  router real.
- `ProviderRouter` ya existe con fallback controlado mediante
  `ProviderRuntimeError` y tests con providers falsos.
- El router ya acepta preflight de disponibilidad/credenciales como dependencia
  inyectable antes de ejecutar providers.
