# CaptionFlow

CaptionFlow es una webapp local para convertir videos de YouTube en documentos Markdown utiles: resumenes, analisis, guias paso a paso, transcripciones cacheadas, diagramas Mermaid, exportaciones PDF y analitica de uso.

La aplicacion funciona sin base de datos. Guarda resultados, metadatos, transcripciones y diagramas en disco, dentro de una ruta configurable.

## Caracteristicas

- Procesa URLs de YouTube, enlaces `youtu.be` y Shorts.
- Extrae metadatos del video: titulo, canal, duracion, fecha e ID.
- Usa `yt-dlp` para descargar subtitulos oficiales o automaticos.
- Cachea transcripciones por video para no repetir descargas.
- Genera documentos Markdown mediante prompts configurables.
- Permite editar prompts desde la UI y usar prompts personalizados puntuales.
- Soporta OpenAI, Google Gemini y Nano-GPT.
- Gestiona modelos por proveedor y limites de contexto.
- Usa troceado adaptativo para videos largos.
- Exporta resultados como Markdown y PDF.
- Genera diagramas Mermaid desde documentos ya creados.
- Muestra historial con busqueda, filtros y agrupacion por video.
- Incluye un dashboard analitico con KPIs, filtros, graficos configurables, leyendas, agrupacion del scatterplot y metricas de tokens/tiempo.
- Permite elegir la ruta raiz de almacenamiento desde configuracion.

## Stack

- Frontend: React 19, Vite 6, TypeScript.
- Backend: Express 5, TypeScript, `tsx`.
- IA: OpenAI, Google Gemini y Nano-GPT.
- YouTube/transcripciones: `yt-dlp`.
- Markdown: `react-markdown`, `remark-gfm`, `marked`.
- PDF: `pdfkit`.
- Graficos: ECharts.
- Diagramas: Mermaid.

## Requisitos

- Node.js 20 o superior.
- npm.
- `yt-dlp` instalado en el `PATH` o disponible como binario local en `bin/yt-dlp.exe`.
- Una API key para al menos un proveedor de IA.

## Instalacion

```bash
npm ci
```

Si necesitas una instalacion flexible:

```bash
npm install
```

## Configuracion de entorno

Copia `.env.example` a `.env` y rellena las claves que vayas a usar:

```env
ACTIVE_PROVIDER=openai
OPENAI_API_KEY=
GOOGLE_API_KEY=
NANOGPT_API_KEY=

# Alias tambien soportados:
# GEMINI_API_KEY=
# NANO_GPT_API_KEY=

# Opcional
PORT=8787
MAX_TRANSCRIPT_CHARS=60000
CHUNK_SIZE_CHARS=22000
```

`ACTIVE_PROVIDER` puede ser:

- `openai`
- `google`
- `nanogpt`

Las API keys solo se leen en backend. El frontend recibe un estado de configuracion, pero no las claves.

## Instalar yt-dlp

Con Python:

```bash
pip install -U yt-dlp
```

Con Windows:

```bash
winget install yt-dlp.yt-dlp
```

Comprueba que esta disponible:

```bash
yt-dlp --version
```

CaptionFlow tambien busca un binario local en:

```text
bin/yt-dlp.exe
```

Ese binario esta ignorado por Git.

## Ejecutar en local

```bash
npm run dev
```

La UI se sirve en:

```text
http://localhost:5174
```

La API escucha por defecto en:

```text
http://localhost:8787
```

Tambien hay un lanzador Windows:

```text
iniciar_captionflow.bat
```

## Scripts

```bash
npm run dev        # Frontend Vite + backend Express
npm run dev:client # Solo frontend
npm run dev:server # Solo backend con watch
npm run typecheck  # TypeScript sin emitir build
npm test           # Tests
npm run build      # TypeScript + build Vite
npm start          # Ejecuta el servidor compilado
```

## Ruta de almacenamiento

Por defecto, si no configuras nada, CaptionFlow usa:

```text
output/
```

Desde la UI puedes abrir Configuracion y definir la **Ruta raiz de almacenamiento**. Esa ruta es la carpeta base donde la app lee y escribe:

```text
output/
  results/      # Markdown generado y .meta.json
  transcripts/  # cache y transcripciones por video
  diagrams/     # diagramas Mermaid .mmd
  analysis/     # archivos de analisis/exportaciones auxiliares
```

El archivo local de preferencias se guarda en:

```text
config/local.settings.json
```

Ese archivo esta ignorado por Git porque contiene preferencias de maquina, como proveedor activo, modelo elegido, ruta local y si la analitica esta activada.

## Ejemplos incluidos

Este repositorio incluye documentacion de ejemplo en `output/`: resultados Markdown, metadatos, transcripciones cacheadas, diagramas Mermaid y archivos de analisis.

Para ver esos ejemplos al clonar:

1. Arranca la app con `npm run dev`.
2. Abre Configuracion.
3. En **Ruta raiz de almacenamiento**, indica la ruta absoluta a la carpeta `output` del repositorio clonado.
4. Activa la analitica si quieres ver el dashboard.
5. Vuelve a la pantalla principal: el historial y la analitica leeran los ejemplos ya calculados.

Si ejecutas la app desde la raiz del repo y no tienes otra ruta guardada en `config/local.settings.json`, la ruta por defecto ya apunta a `output/`.

## Flujo de uso

1. Pega una URL de YouTube.
2. Elige un prompt de procesamiento.
3. Opcionalmente personaliza el prompt para esa ejecucion.
4. La app valida URL, proveedor, modelo, API key y limites de contexto.
5. `yt-dlp` obtiene metadatos y subtitulos.
6. Si existe cache de transcripcion para ese video, la reutiliza.
7. Si el video es largo, se aplica troceado fijo o adaptativo.
8. El backend llama al proveedor/modelo activo.
9. El resultado se guarda como Markdown y `.meta.json`.
10. Desde la UI puedes abrir, copiar, descargar Markdown/PDF, ver prompt, ver transcripcion o generar diagramas.

## Prompts

Los prompts viven en:

```text
prompts/
```

Cada prompt es un Markdown con frontmatter:

```md
---
name: "Resumen ejecutivo"
description: "Genera un resumen claro y estructurado del video"
output_filename_prefix: "resumen"
temperature: 0.3
---

Contenido del prompt...
```

Campos principales:

- `name`: nombre visible en la UI.
- `description`: descripcion breve.
- `output_filename_prefix`: prefijo del archivo generado.
- `temperature`: temperatura enviada al proveedor IA.

Los prompts se pueden crear, editar y eliminar desde la pestana **Prompts** del modal de configuracion.

## Diagramas Mermaid

Los prompts de diagramas viven en:

```text
prompts/diagrams/
```

Incluyen plantillas para:

- Flowchart.
- Mindmap.
- Timeline.
- Sequence diagram.

Los diagramas generados se guardan como `.mmd` en `output/diagrams/`. Si ya existe un diagrama para un documento, la UI permite abrir el existente o generar uno nuevo.

## Historial

El historial se reconstruye leyendo los archivos guardados en disco. Permite:

- Agrupar documentos por video.
- Filtrar por canal, mes, modelo y diagramas.
- Buscar por titulo.
- Abrir resultados antiguos.
- Descargar Markdown o PDF.
- Ver la transcripcion original.
- Ver el prompt usado.
- Ver metadatos de proveedor, modelo, tokens, duracion y chunking.

## Analitica

La vista analitica se activa desde Configuracion. Lee los metadatos de `output/results/*.meta.json` y genera un dataset local.

Incluye:

- KPIs compactos: tokens, tiempo total, tiempo medio de proceso, duracion media, palabras input/output, documentos y diagramas.
- Filtros por tipo, canal, proveedor, modelo, prompt, video/documento y mes.
- Barras verticales y horizontales con dimension, metrica, leyenda y agregacion configurables.
- Scatterplot con eje X, eje Y, agrupacion de puntos, leyenda y agregacion.
- Heatmap con doble dimension y escala de intensidad.
- Pie chart para distribuciones.
- Click en graficos para filtrar.
- Modelos mostrados sin prefijo de proveedor, por ejemplo `alibaba/qwen3.6-27b` se muestra como `qwen3.6-27b`.

Notas sobre conteos:

- Un elemento del historial puede generar varias filas analiticas internas: total del proceso, documento y, si aplica, diagrama.
- Por defecto la vista muestra el total del proceso.

## Seguridad

- No subas `.env`; esta ignorado por Git.
- No subas `config/local.settings.json`; contiene preferencias locales.
- Las API keys no se exponen al frontend.
- `yt-dlp.exe`, `dist/`, `node_modules/` y caches locales estan ignorados.
- El contenido de `output/` incluido en este repo son ejemplos ya calculados. Si generas contenido privado, revisalo antes de publicarlo.

## Estructura principal

```text
src/
  analytics/        # utilidades y tests de analitica
  components/       # UI React
  server/           # API Express, procesamiento, IA, archivos
  shared/           # tipos compartidos
prompts/            # prompts de documento
prompts/diagrams/   # prompts de diagramas
output/             # ejemplos generados incluidos en el repo
config/             # configuracion local ignorada
```

## Validacion antes de publicar

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` puede mostrar avisos de chunks grandes por Mermaid/ECharts. No bloquean el build.
