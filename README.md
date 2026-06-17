# CaptionFlow

CaptionFlow es una app web local para pegar una URL de YouTube, elegir un prompt Markdown y generar un documento Markdown con IA a partir de la transcripción del vídeo.

La V1 está pensada para ser simple: React + Vite en frontend, Express en backend, `yt-dlp` para captions y sistema de ficheros local para transcripciones/resultados.

## Requisitos

- Node.js 20 o superior.
- npm.
- `yt-dlp` instalado y disponible en el `PATH`.
- Una API key del proveedor IA que quieras usar.

## Instalación

```bash
npm install
```

## Configuración

Copia `.env.example` a `.env` y rellena la clave del proveedor que vayas a usar:

```env
ACTIVE_PROVIDER=openai
OPENAI_API_KEY=
GOOGLE_API_KEY=
NANOGPT_API_KEY=

# Alias tambien soportados:
# GEMINI_API_KEY=
# NANO_GPT_API_KEY=
PORT=8787
MAX_TRANSCRIPT_CHARS=60000
CHUNK_SIZE_CHARS=22000
```

Las claves nunca se envían al frontend. El modal de configuración solo muestra proveedor, modelo y si el backend detecta una clave.

La app puede guardar preferencias no sensibles en:

```text
config/local.settings.json
```

Este archivo está ignorado por Git.

## Instalar yt-dlp

Opciones habituales:

```bash
pip install -U yt-dlp
```

O con Windows:

```bash
winget install yt-dlp.yt-dlp
```

Comprueba que funciona:

```bash
yt-dlp --version
```

Si no tienes Python ni winget, CaptionFlow tambien puede usar un binario local en:

```text
bin/yt-dlp.exe
```

El backend lo buscara antes de intentar usar `yt-dlp` desde el `PATH`.

## Ejecutar en local

```bash
npm run dev
```

La UI se abrirá en:

```text
http://localhost:5174
```

La API escucha por defecto en:

```text
http://localhost:8787
```

## Crear nuevos prompts

Añade ficheros `.md` dentro de `/prompts`. Cada prompt debe tener frontmatter YAML simple:

```md
---
name: "Resumen ejecutivo"
description: "Genera un resumen claro y estructurado del vídeo"
output_filename_prefix: "resumen"
temperature: 0.3
---

Contenido del prompt aquí...
```

La app carga los prompts dinámicamente. Si falta `name`, usa el nombre del fichero como fallback.

## Prompts de diagramas

Los diagramas Mermaid usan prompts editables en:

```text
prompts/diagrams
```

La V1.1 incluye:

```text
flowchart.md
mindmap.md
timeline.md
sequence.md
```

Cada prompt puede declarar frontmatter:

```md
---
name: "Diagrama de flujo"
description: "Genera un flowchart Mermaid claro y robusto"
output_filename_prefix: "flowchart"
diagram_type: "flowchart TD"
temperature: 0.2
---

Genera solo codigo Mermaid valido...
```

La UI muestra estos prompts en el menu Diagrama para elegir el tipo antes de generar el Mermaid. El endpoint `GET /api/diagram-prompts` expone el catalogo desde backend.

## Flujo

1. El usuario pega una URL de YouTube.
2. Elige un prompt.
3. El backend valida URL, prompt, proveedor, modelo y API key.
4. `yt-dlp` intenta obtener subtítulos oficiales y luego autogenerados.
5. La transcripción se reutiliza desde cache si ese video ya se proceso antes.
6. La transcripción se guarda en `/output/transcripts`.
7. La app combina prompt, metadatos y transcripción.
8. Se llama únicamente al proveedor/modelo activos.
9. El resultado se guarda en `/output/results`.
10. El frontend muestra la vista previa renderizada y permite copiar o descargar `.md`.

## Estado y cache

`POST /api/process` inicia un trabajo y devuelve un `jobId`. El frontend consulta `GET /api/process/:jobId` para mostrar estados reales del backend, como validacion, obtencion de subtitulos, envio a IA y guardado del resultado.

La cache de transcripciones vive en:

```text
output/transcripts/cache
```

Se guarda por ID de video de YouTube y evita repetir `yt-dlp` cuando vuelves a procesar el mismo video con otro prompt.

## Proveedores y modelos

Los proveedores disponibles son:

- OpenAI.
- Google Gemini.
- Nano-GPT.

Los modelos se exponen desde backend. `src/server/config/modelCatalog.ts` contiene fallbacks curados, y `src/server/config/modelService.ts` intenta listar modelos dinamicamente para Nano-GPT y Gemini cuando existe API key. El frontend no tiene modelos hardcodeados.

Nano-GPT se trata como API compatible con OpenAI usando `https://nano-gpt.com/api/v1` como base. Gemini mantiene adaptador propio porque su API no comparte el mismo formato de chat completions.

## Seguridad

- `.env`, `output`, transcripciones, resultados y `config/local.settings.json` están en `.gitignore`.
- Las API keys solo se leen en backend.
- No se devuelven secretos en ninguna respuesta API.
- `yt-dlp` se ejecuta con `spawn` y argumentos separados, sin concatenar comandos.
- Los nombres de archivo generados se sanitizan.

## Limitaciones conocidas

- No hay login, base de datos ni cola de trabajos.
- Los trabajos de proceso viven en memoria; si reinicias el backend, los jobs activos se pierden, pero los archivos ya guardados se conservan.
- Los modelos se gestionan con catálogo backend configurable.
- El chunking de transcripciones largas es básico: resume partes y luego genera una síntesis final.
- Depende de que YouTube exponga captions oficiales o autogeneradas para el vídeo.
