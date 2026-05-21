# Cambios Propuestos para CaptionFlow v2

> Documento derivado del analisis critico del plan original (`planificacion-mejoras.md`).
> Este documento mapea **que cambia**, **porque cambia** y **como cambia** respecto al documento original.
> Destinado a guiar la implementacion en Codex con precision.

---

## 1. Cambios Estrategicos

### 1.1 Nuevo Enfoque: Local-first con API Fallback

| Aspecto | Documento Original | Propuesta Nueva |
|---------|-------------------|-----------------|
| **Enfoque** | "local o semilocal" (ambiguo) | **Local-first con API fallback** |
| **Transcripcion** | faster-whisper (local) como unico primario | faster-whisper (local) primario, nano-gpt/OpenAI Whisper como fallback |
| **Traduccion** | Claude y NLLB como proveedores iniciales | nano-gpt (Qwen) primario, OpenAI fallback, **NLLB eliminado como obligatorio** |
| **TTS** | Edge-TTS como unico primario | Edge-TTS (local/gratis) primario, OpenAI TTS como fallback de calidad |
| **SDK unificado** | `anthropic` + `torch` + `transformers` + `edge-tts` | `openai` SDK sirve para OpenAI **y** nano-gpt (mismo protocolo) |

**Razon:** Reduce dependencias pesadas (~3GB), simplifica configuracion (1 SDK para 2 providers), mejora calidad de traduccion (Qwen > NLLB), y mantiene modo offline via faster-whisper + Edge-TTS.

---

### 1.2 Proveedores IA: De 4 SDKs a 1

| Proveedor Original | SDK Requerido | Propuesta Nueva | SDK Requerido |
|-------------------|---------------|-----------------|---------------|
| Claude (traduccion) | `anthropic>=0.30.0` | nano-gpt/Qwen (traduccion) | `openai>=1.30.0` |
| NLLB (traduccion) | `torch>=2.0.0` + `transformers>=4.34.0` + `sentencepiece` | **Eliminado como obligatorio** | — |
| faster-whisper (transcripcion) | `faster-whisper>=1.0.0` | faster-whisper (local) + nano-gpt Whisper (API) | `faster-whisper` (opcional) + `openai` |
| Edge-TTS (TTS) | `edge-tts>=6.1.0` | Edge-TTS (local) + OpenAI TTS (API) | `edge-tts` (opcional) + `openai` |

**Resultado:** Se pasa de **4 SDKs** a **1 SDK principal** (`openai`) + 2 opcionales (`faster-whisper`, `edge-tts`).

---

### 1.3 Eliminacion de `torch` como Dependencia Obligatoria

| Estado | Detalle |
|--------|---------|
| **Original** | `torch>=2.0.0` en `requirements.txt` (obligatorio) |
| **Propuesto** | `torch` pasa a `requirements-optional.txt` (solo para NLLB local) |
| **Ahorro** | ~2GB de instalacion, ~1.3GB de modelo NLLB, ~4GB RAM en ejecucion |

---

## 2. Cambios en Arquitectura

### 2.1 Nuevos Contratos de Proveedores

El documento original define contratos genericos. La propuesta los actualiza con soporte explicito para nano-gpt y OpenAI como providers API unificados.

#### Cambios en `TranscriptionProvider`

```python
# ORIGINAL: solo faster-whisper
class TranscriptionProvider:
    def transcribe(self, audio_path: str, language: str) -> List[TranscriptSegment]: ...

# PROPUESTO: soporte API + local + fallback
class TranscriptionProvider:
    def transcribe(self, audio_path: str, language: str) -> List[TranscriptSegment]: ...
    def get_capabilities(self) -> ProviderCapabilities: ...
    def is_available(self) -> ProviderAvailabilityCheck: ...
```

#### Nuevos Proveedores a Implementar

| Proveedor | Clase | Archivo | Tipo |
|-----------|-------|---------|------|
| nano-gpt Whisper | `NanoGPTWhisperProvider` | `providers/nanogpt_whisper.py` | API |
| OpenAI Whisper | `OpenAIWhisperProvider` | `providers/openai_whisper.py` | API |
| nano-gpt Chat (traduccion) | `NanoGPTTranslationProvider` | `providers/nanogpt_translation.py` | API |
| OpenAI Chat (traduccion) | `OpenAITranslationProvider` | `providers/openai_translation.py` | API |
| OpenAI TTS | `OpenAITTSProvider` | `providers/openai_tts.py` | API |

#### Provider Router (NUEVO - no existe en original)

```python
# providers/router.py (NUEVO)
class ProviderRouter:
    """Enruta llamadas al provider primario con fallback automatico."""

    def __init__(self, config: dict):
        self.clients = {
            "nano-gpt": OpenAI(
                api_key=os.getenv("NANO_GPT_API_KEY"),
                base_url="https://nano-gpt.com/api/v1"
            ),
            "openai": OpenAI(
                api_key=os.getenv("OPENAI_API_KEY"),
            ),
        }
        self.fallback_chain = config.get("fallback_chain", {})

    def call(self, task: str, model: str, messages: list, **kwargs):
        primary = self.fallback_chain.get(task, {}).get("primary", "nano-gpt")
        try:
            return self._execute(primary, model, messages, **kwargs)
        except Exception:
            fallback = self.fallback_chain[task]["fallback"]
            fallback_model = self.fallback_chain[task]["fallback_model"]
            return self._execute(fallback, fallback_model, messages, **kwargs)
```

### 2.2 Cambios en la Capa de Adaptadores

| Original (seccion 4.1) | Propuesta |
|------------------------|-----------|
| Adaptadores: `ffmpeg`, `faster-whisper`, Claude, NLLB, Edge-TTS | Adaptadores: `ffmpeg`, `faster-whisper` (opcional), Edge-TTS (opcional), **nano-gpt** (API), **OpenAI** (API) |
| NLLB como adaptador de traduccion local | **Eliminado** como adaptador obligatorio |

### 2.3 Cambios en `ProviderConfig`

| Campo Original | Propuesto |
|----------------|-----------|
| `provider: str` | `provider: str` (sin cambio) |
| `model: str` | `model: str` (sin cambio) |
| `credentials: dict` | `api_key_env: str` (nombre de variable de entorno, no el valor) |
| — | `base_url: str` (NUEVO: para nano-gpt vs OpenAI) |
| — | `fallback_provider: str` (NUEVO) |
| — | `fallback_model: str` (NUEVO) |

---

## 3. Cambios en Dependencias

### 3.1 `requirements.txt` (Nuevo)

```txt
# OBLIGATORIAS
ffmpeg-python>=0.2.0
openai>=1.30.0
numpy>=1.24.0
soundfile>=0.12.0

# OPCIONALES (requirements-optional.txt)
faster-whisper>=1.0.0    # Transcripcion local (sin internet)
edge-tts>=6.1.0          # TTS local gratuito
torch>=2.0.0             # Solo para NLLB local
transformers>=4.34.0      # Solo para NLLB local
sentencepiece             # Solo para NLLB local
librosa>=0.10.0          # Solo para procesamiento audio avanzado
```

### 3.2 `requirements-optional.txt` (NUEVO)

```txt
faster-whisper>=1.0.0
edge-tts>=6.1.0
torch>=2.0.0
transformers>=4.34.0
sentencepiece
librosa>=0.10.0
```

### 3.3 Eliminadas como Obligatorias

| Dependencia | Razon de Eliminacion |
|-------------|---------------------|
| `anthropic>=0.30.0` | Reemplazado por `openai` SDK (nano-gpt usa protocolo OpenAI) |
| `torch>=2.0.0` | Solo necesario para NLLB local (caso opcional) |
| `transformers>=4.34.0` | Solo necesario para NLLB local (caso opcional) |
| `sentencepiece` | Solo necesario para NLLB local (caso opcional) |
| `librosa>=0.10.0` | Solo para procesamiento avanzado (caso opcional) |

---

## 4. Cambios por Fase

### Fase 0: Estabilizacion del Proyecto Base

| Item | Original | Propuesto | Cambio |
|------|----------|-----------|-------|
| Separar dependencias | "si aplica" | **Obligatorio**: crear `requirements-optional.txt` | Critico para eliminar torch como obligatorio |
| Eliminar `anthropic` | No mencionado | **Eliminar** de requirements base, mover a optional | Reemplazado por `openai` SDK |
| Anadir `openai` | No mencionado | **Anadir** `openai>=1.30.0` como dependencia base | Necesario para nano-gpt y OpenAI |

### Fase 1: Especificacion y Modelo de Dominio

| Item | Original | Propuesto | Cambio |
|------|----------|-----------|-------|
| Proveedores iniciales transcripcion | `faster-whisper` | `faster-whisper` (local) + `nano-gpt/whisper-large-v3` (API) | Anadido provider API |
| Proveedores iniciales traduccion | Claude y NLLB | **nano-gpt/Qwen** + **OpenAI/gpt-4o-mini** | Cambio de providers |
| Proveedores iniciales TTS | Edge-TTS | Edge-TTS (local) + **OpenAI/tts-1** (API) | Anadido provider API |
| Contrato `ProviderConfig` | Sin `base_url`, sin fallback | Anadir `base_url`, `fallback_provider`, `fallback_model`, `api_key_env` | Campos nuevos |
| Contrato `ProviderCapabilities` | Sin `is_local`, sin `base_url` | Anadir `is_local: bool`, `base_url: Optional[str]`, `privacy_level: str` | Campos nuevos |

### Fase 2: Instalacion, Diagnostico y Configuracion

| Item | Original | Propuesto | Cambio |
|------|----------|-----------|-------|
| Deteccion de claves API | `ANTHROPIC_API_KEY` | `NANO_GPT_API_KEY` + `OPENAI_API_KEY` | Nuevas env vars |
| Deteccion GPU | Para NLLB y Whisper | **Solo para faster-whisper** (NLLB ya no es obligatorio) | Reduce requisitos |
| `ProviderRegistry` | Lista estatica | Registry dinamico que detecta providers API disponibles via conectividad | Mas robusto |
| Validacion de credenciales | Solo Anthropic | Validacion de API keys para nano-gpt y OpenAI (llamada ligera) | Nuevos providers |

### Fase 3: Gestion de Proyectos y Cola de Trabajos

| Item | Original | Propuesto | Cambio |
|------|----------|-----------|-------|
| Metadatos por job | Proveedor y modelo | Anadir `api_provider`, `base_url`, `coste_estimado_usd`, `privacy_level` | Trazabilidad ampliada |
| Cache de respuestas | No mencionado | **NUEVO**: Cache local de respuestas API para evitar costes repetidos | Ahorro de coste |

### Fase 7: Traduccion Robusta y Glosarios

| Item | Original | Propuesto | Cambio |
|------|----------|-----------|-------|
| Proveedores de traduccion | Claude + NLLB | **nano-gpt/Qwen** + **OpenAI** + NLLB (opcional) | Cambio principal |
| Contrato traductor por lotes | Sin `base_url` | Anadir `base_url` en config del provider | Soporte multi-endpoint |
| Registro de coste | "si se usa API externa" | **Obligatorio** para todo provider API | Trazabilidad completa |
| Fallback entre providers | No especificado | **NUEVO**: Fallback automatico nano-gpt -> OpenAI | Resiliencia |

### Fase 8: Doblaje TTS Mejorado

| Item | Original | Propuesto | Cambio |
|------|----------|-----------|-------|
| Proveedores TTS iniciales | Edge-TTS | Edge-TTS (local/gratis) + **OpenAI TTS** (API/calidad) | Anadido provider |
| Contrato TTS | Sin estimacion de coste | Anadir `estimated_cost_usd` en resultado | Trazabilidad |

### Fase 9: Configuracion Avanzada de Modelos y Proveedores

| Item | Original | Propuesto | Cambio |
|------|----------|-----------|-------|
| Seleccion de modelos | Solo Whisper | Seleccion para **todas** las tareas: transcripcion, traduccion, TTS | Ampliado |
| Estimacion de coste | "aproximado" | Tabla de costes por modelo con datos reales de nano-gpt/OpenAI | Datos concretos |
| Indicacion de privacidad | "local, remoto o mixto" | 3 niveles: `local` (sin red), `api-cloud` (API externa), `hybrid` (mixto) | Mas preciso |
| Fallback entre providers | "configurable" | **ProviderRouter** con fallback automatico por tarea | Implementacion concreta |

---

## 5. Nuevos Componentes (No Existentes en Original)

### 5.1 `providers/router.py` - Provider Router

Enruta llamadas IA al provider primario con fallback automatico.

- Recibe config con cadena de fallback por tarea
- Usa `openai` SDK con diferente `base_url` para nano-gpt vs OpenAI
- Registra proveedor usado, modelo, coste y advertencias en metadatos
- Reintenta automaticamente con provider alternativo si el primario falla

### 5.2 `providers/nanogpt_translation.py` - Traduccion via nano-gpt

Adaptador de traduccion usando la API de nano-gpt.

- Base URL: `https://nano-gpt.com/api/v1`
- Auth: `Authorization: Bearer $NANO_GPT_API_KEY`
- Modelo por defecto: `qwen/qwen3.5-397b-a17b`
- Mantiene cardinalidad de segmentos (mismo numero entrada que salida)
- Registra coste estimado por tokens usados

### 5.3 `providers/nanogpt_whisper.py` - Transcripcion via nano-gpt

Adaptador de transcripcion usando Whisper via nano-gpt.

- Modelo por defecto: `openai/whisper-large-v3`
- Fallback cuando faster-whisper no esta disponible (sin GPU, sin dependencia)

### 5.4 `providers/openai_translation.py` - Traduccion via OpenAI

Adaptador de traduccion usando OpenAI Chat API.

- Modelo por defecto: `gpt-4o-mini`
- Fallback de nano-gpt si este falla

### 5.5 `providers/openai_tts.py` - TTS via OpenAI

Adaptador TTS usando OpenAI TTS API.

- Modelo por defecto: `tts-1`
- Voz por defecto: `alloy`
- Fallback de calidad cuando Edge-TTS no es suficiente

### 5.6 Cache de Respuestas API

- Directorio: `~/.captionflow/cache/`
- Clave: hash de (provider, model, input, parametros)
- Formato: JSON con respuesta + metadatos + timestamp
- Expiracion configurable (por defecto 7 dias)
- Evita llamadas API duplicadas para mismos inputs

---

## 6. Configuracion por Defecto (NUEVO)

### 6.1 `config/default.yaml`

```yaml
providers:
  transcription:
    primary: faster-whisper
    primary_model: large-v3
    fallback: nano-gpt
    fallback_model: openai/whisper-large-v3
    options:
      device: auto

  translation:
    primary: nano-gpt
    primary_model: qwen/qwen3.5-397b-a17b
    fallback: openai
    fallback_model: gpt-4o-mini
    options:
      temperature: 0.3

  tts:
    primary: edge-tts
    primary_model: es-ES-AlvaroNeural
    fallback: openai
    fallback_model: tts-1
    options:
      voice: alloy
      speed: 1.0

cache:
  enabled: true
  path: ~/.captionflow/cache
  ttl_days: 7

api_keys:
  nano_gpt: NANO_GPT_API_KEY
  openai: OPENAI_API_KEY

privacy_levels:
  local: "Sin conexion a internet. Datos permanecen en tu PC."
  api_cloud: "Los datos se envian al proveedor de IA via API."
  hybrid: "Mixto: algunos pasos son locales, otros requieren internet."
```

### 6.2 Variables de Entorno

| Variable | Proveedor | Donde obtenerla |
|----------|-----------|----------------|
| `NANO_GPT_API_KEY` | nano-gpt | https://nano-gpt.com (crear API key) |
| `OPENAI_API_KEY` | OpenAI | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | Anthropic | **Opcional** (solo si se usa Claude directo) |

---

## 7. Cambios en Costes Estimados

### 7.1 Coste por Hora de Video (Configuracion Propuesta)

| Configuracion | Transcripcion | Traduccion | TTS | Total/hora |
|---------------|--------------|------------|-----|-----------|
| **Todo local** (faster-whisper + NLLB + Edge-TTS) | $0 | $0 | $0 | **$0** |
| **Hibrido recomendado** (faster-whisper + nano-gpt/Qwen + Edge-TTS) | $0 | $0.03 | $0 | **$0.03** |
| **Todo API** (nano-gpt Whisper + Qwen + OpenAI TTS) | $0.18 | $0.03 | $1.80 | **$2.01** |
| **Original con Claude** (faster-whisper + Claude + Edge-TTS) | $0 | $0.22 | $0 | **$0.22** |

### 7.2 Coste Mensual Estimado (50 horas/mes)

| Configuracion | Coste Mensual | Nota |
|---------------|--------------|------|
| Todo local | $0 | Requiere GPU para NLLB, lento sin ella |
| **Hibrido recomendado** | **$1.50** | Mejor calidad, sin GPU, rapido |
| Todo API | $100.50 | Maxima comodidad, sin GPU |
| Original con Claude | $11.00 | Mas caro que nano-gpt/Qwen |

---

## 8. Cambios en Riesgos y Mitigaciones

### 8.1 Riesgos Eliminados o Reducidos

| Riesgo Original | Estado | Razon |
|-----------------|--------|-------|
| "Modelos pesados: Whisper y NLLB pueden ser lentos o dificiles de instalar" | **Reducido** | NLLB ya no es obligatorio; Whisper API como fallback |
| "Vendor lock-in: acoplar el producto a un unico proveedor" | **Mitigado** | 2 providers API (nano-gpt + OpenAI) con fallback automatico |
| "Costes API: la traduccion externa debe controlar errores, limites y gasto" | **Reducido** | nano-gpt/Qwen es ~7x mas barato que Claude para traduccion |

### 8.2 Nuevos Riesgos

| Riesgo Nuevo | Mitigacion |
|-------------|-----------|
| nano-gpt puede cambiar precios o disponibilidad | Fallback automatico a OpenAI |
| Dependencia de conexion a internet para traduccion | faster-whisper funciona offline; Edge-TTS funciona offline |
| Cache de respuestas puede crecer mucho | TTL configurable, limpieza automatica |
| Un unico SDK (`openai`) para 2 providers | Si OpenAI SDK cambia, afecta ambos; mitigado con versionado fijo |

### 8.3 Mitigaciones Anadidas

| Mitigacion Nueva |
|-----------------|
| Fallback automatico entre nano-gpt y OpenAI por tarea |
| Cache local de respuestas API para evitar costes duplicados |
| Estimacion de coste en tiempo real antes de ejecutar jobs largos |
| Indicador de privacidad (local/api_cloud/hybrid) visible en CLI y futura UI |
| Variables de entorno para API keys (nunca en codigo ni en config versionado) |

---

## 9. Cambios en el Backlog Priorizado

| Prioridad | Original | Propuesto | Razon del Cambio |
|-----------|----------|-----------|-----------------|
| 1 | Estabilizacion, tests y diagnostico base | **Igual** + separar dependencias obligatorias/opcionales | Critico para eliminar torch obligatorio |
| 2 | Arquitectura provider-ready ligera | **Igual** + anadir ProviderRouter y providers nano-gpt/OpenAI | Expandir contratos con fallback |
| 3 | Interfaz visual local | **Igual** | Sin cambio |
| 4 | Editor de subtitulos | **Igual** | Sin cambio |
| 5 | Cola de trabajos e historial | **Igual** + cache de respuestas API | Anadido cache |
| 6 | Previsualizacion de video | **Igual** | Sin cambio |
| 7 | Exportacion profesional | **Igual** | Sin cambio |
| 8 | Traduccion robusta y glosarios | **Cambiado**: providers nano-gpt/OpenAI en lugar de Claude/NLLB | Mejor coste y calidad |
| 9 | Doblaje TTS mejorado | **Cambiado**: anadir OpenAI TTS como provider | Mas opciones de voces |
| 10 | Configuracion avanzada de modelos | **Cambiado**: anadir tabla de costes real y privacy levels | Datos concretos de nano-gpt |
| 11 | Distribucion y mantenimiento | **Igual** | Sin cambio |

---

## 10. Mapa de Cambios por Archivo

### Archivos a Modificar

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `requirements.txt` | Eliminar `anthropic`, `torch`, `transformers`, `sentencepiece`, `librosa`; Anadir `openai>=1.30.0` | Alta |
| `subtitle_pipeline/translator.py` | Anadir soporte para nano-gpt y OpenAI como providers de traduccion | Alta |
| `subtitle_pipeline/tts.py` | Anadir soporte para OpenAI TTS como provider alternativo | Media |
| `subtitle_pipeline/transcriber.py` | Anadir soporte para Whisper via API (nano-gpt/OpenAI) como fallback | Media |
| `subtitle_pipeline/models.py` | Anadir campos `base_url`, `fallback_provider`, `fallback_model`, `api_key_env`, `privacy_level` a ProviderConfig | Alta |
| `subtitle_pipeline/pipeline.py` | Integrar ProviderRouter para fallback automatico | Alta |
| `subtitle_pipeline/doctor.py` | Anadir deteccion de `NANO_GPT_API_KEY`, `OPENAI_API_KEY`, y conectividad | Alta |
| `pyproject.toml` | Anadir `openai` a dependencias base | Alta |

### Archivos a Crear

| Archivo | Contenido | Prioridad |
|---------|-----------|-----------|
| `requirements-optional.txt` | Dependencias opcionales (faster-whisper, edge-tts, torch, etc.) | Alta |
| `subtitle_pipeline/providers/router.py` | ProviderRouter con fallback automatico | Alta |
| `subtitle_pipeline/providers/nanogpt_translation.py` | Adaptador traduccion nano-gpt | Alta |
| `subtitle_pipeline/providers/nanogpt_whisper.py` | Adaptador transcripcion nano-gpt Whisper | Media |
| `subtitle_pipeline/providers/openai_translation.py` | Adaptador traduccion OpenAI | Alta |
| `subtitle_pipeline/providers/openai_tts.py` | Adaptador TTS OpenAI | Media |
| `subtitle_pipeline/providers/openai_whisper.py` | Adaptador transcripcion OpenAI Whisper | Media |
| `subtitle_pipeline/cache.py` | Cache de respuestas API | Media |
| `config/default.yaml` | Configuracion por defecto con providers y fallback | Alta |

### Archivos a Eliminar (como obligatorios)

| Archivo/Campo | Razon |
|---------------|-------|
| Referencia a `anthropic` en `requirements.txt` | Reemplazado por `openai` SDK (nano-gpt usa mismo protocolo) |
| Referencia a `torch`/`transformers`/`sentencepiece` en `requirements.txt` | Movidos a `requirements-optional.txt` |

---

## 11. Resumen Ejecutivo de Cambios

| Categoria | Cambios | Impacto |
|-----------|---------|---------|
| **Estrategia** | Local-first con API fallback (nano-gpt + OpenAI) | Reduce dependencias, mejora calidad, simplifica config |
| **Dependencias** | 4 SDKs -> 1 SDK (`openai`), torch opcional | -3GB instalacion, -4GB RAM |
| **Providers** | +5 providers API (nano-gpt x2, OpenAI x3), +ProviderRouter | Fallback automatico, resiliencia |
| **Coste** | Traduccion: Claude $0.22/h -> Qwen $0.03/h | 7x mas barato |
| **Config** | +`config/default.yaml`, +cache, +privacy levels | Reproducibilidad y trazabilidad |
| **Riesgos** | Vendor lock-in mitigado, modelos pesados opcionales | Menor riesgo tecnico |
