# CaptionFlow

CaptionFlow es una aplicacion local para convertir videos de YouTube en documentos Markdown listos para trabajar. Descarga o reutiliza transcripciones, procesa el contenido con modelos de IA, guarda resultados en disco, genera PDF, crea diagramas Mermaid y ofrece un dashboard local de analitica.

La aplicacion no usa base de datos. Todo lo generado se guarda en una carpeta local configurable.

## Caracteristicas principales

- Procesamiento de URLs de YouTube, `youtu.be` y Shorts.
- Extraccion de metadatos del video: titulo, canal, duracion, idioma, fuente de subtitulos y fecha de procesamiento.
- Descarga de subtitulos oficiales o automaticos mediante `yt-dlp`.
- Cache local de transcripciones para evitar descargas repetidas.
- Generacion de documentos Markdown con prompts configurables.
- Editor de prompts desde la UI, incluyendo creacion, edicion y eliminacion.
- Prompt personalizado puntual para una ejecucion concreta.
- Proveedores IA soportados: OpenAI, Google Gemini y Nano-GPT.
- Seleccion de proveedor/modelo desde configuracion.
- Filtro de modelos por contexto minimo.
- Validacion de limites de contexto y chunking adaptativo para transcripciones largas.
- Historial local agrupado por video, con filtros por canal, mes, modelo y diagramas.
- Vista de resultado con metadatos, uso de tokens, tiempos, prompt y transcripcion.
- Exportacion de Markdown y PDF.
- Generacion y visualizacion de diagramas Mermaid desde documentos existentes.
- Dashboard de analitica con KPIs, filtros y graficos configurables.
- Ruta raiz de almacenamiento configurable desde la UI.

## Stack

- Frontend: React 19, Vite 6, TypeScript.
- Backend: Express 5, TypeScript y `tsx`.
- UI: CSS propio y `lucide-react`.
- Markdown: `react-markdown`, `remark-gfm` y `marked`.
- PDF: `pdfkit`.
- Diagramas: Mermaid.
- Graficos: ECharts.
- Transcripciones: `yt-dlp`.
- Tests: `node:test` ejecutado con `tsx`.

## Requisitos

- Node.js 20 o superior.
- npm.
- `yt-dlp` instalado en el `PATH` o disponible localmente en `bin/yt-dlp.exe`.
- API key de al menos un proveedor IA.

## Instalacion

```bash
npm ci
```

Si necesitas una instalacion flexible:

```bash
npm install
```

## Configuracion

Copia `.env.example` a `.env` y rellena las claves necesarias:

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

`ACTIVE_PROVIDER` acepta:

- `openai`
- `google`
- `nanogpt`

Las claves solo las lee el backend. El frontend recibe el estado de configuracion, nunca las API keys.

## Instalar yt-dlp

Con Python:

```bash
pip install -U yt-dlp
```

Con Windows:

```bash
winget install yt-dlp.yt-dlp
```

Comprueba la instalacion:

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

Este comando arranca:

- API Express en `http://127.0.0.1:8787`.
- Cliente Vite en `http://localhost:5174`.

La configuracion de Vite proxy redirige `/api` hacia el backend local.

## Scripts disponibles

```bash
npm run dev        # API Express + cliente Vite
npm run dev:server # Solo API Express con watch
npm run dev:client # Solo cliente Vite
npm run typecheck  # TypeScript sin emitir archivos
npm test           # Tests unitarios
npm run build      # Typecheck + build de cliente Vite
```

`npm run build` puede mostrar avisos de chunks grandes por Mermaid/ECharts. Son avisos de empaquetado, no fallos de compilacion.

## Estructura del proyecto

```text
src/
  api/              # cliente API y tipos compartidos del frontend
  analytics/        # agregaciones y utilidades de analitica
  components/       # componentes React
  hooks/            # estado de prompts, historial, proceso, diagramas y modales
  server/           # API Express y servicios backend
  shared/           # contratos compartidos
  utils/            # formateadores y utilidades puras
prompts/            # prompts de documentos editables desde la UI
prompts/diagrams/   # prompts para diagramas Mermaid
scripts/            # scripts de desarrollo local
```

Carpetas locales no versionadas:

```text
output/             # resultados, metadatos, transcripciones y diagramas generados
config/             # preferencias locales de la app
bin/                # binarios locales opcionales, como yt-dlp
dist/               # build Vite
node_modules/       # dependencias instaladas
```

## Almacenamiento local

Por defecto, CaptionFlow usa:

```text
output/
```

Desde Configuracion puedes definir una ruta raiz distinta. La app usa esa carpeta como base para:

```text
output/
  results/          # documentos Markdown y .meta.json
  transcripts/
    by-video/       # transcripciones canonicas por video
    cache/          # cache de metadatos/subtitulos de yt-dlp
  diagrams/         # diagramas Mermaid .mmd
```

Las preferencias locales se guardan en:

```text
config/local.settings.json
```

La configuracion de dashboards de analitica se guarda en:

```text
config/analytics.dashboards.json
```

Estos archivos y carpetas estan ignorados por Git porque son datos locales o generados.

## Flujo de uso

1. Pega una URL de YouTube.
2. Elige un prompt de procesamiento.
3. Opcionalmente personaliza el prompt para esa ejecucion.
4. La API valida URL, proveedor, modelo, API key y limites de contexto.
5. `yt-dlp` obtiene metadatos y subtitulos.
6. Si ya existe cache para ese video, se reutiliza.
7. Si la transcripcion supera el contexto seguro, se aplica chunking.
8. El backend llama al proveedor IA seleccionado.
9. El resultado se guarda como Markdown y `.meta.json`.
10. Desde la UI puedes abrir, copiar, descargar Markdown/PDF, ver prompt, ver transcripcion o generar diagramas.

## Prompts

Los prompts de documentos viven en:

```text
prompts/
```

Cada prompt es un archivo Markdown con frontmatter:

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

- `name`: nombre visible.
- `description`: descripcion breve.
- `output_filename_prefix`: prefijo para el archivo generado.
- `temperature`: temperatura enviada al proveedor IA.

Desde Configuracion > Prompts puedes crear, editar y eliminar prompts.

## Diagramas Mermaid

Los prompts de diagramas viven en:

```text
prompts/diagrams/
```

Actualmente se incluyen plantillas para:

- Flowchart.
- Mindmap.
- Timeline.
- Sequence diagram.

Los diagramas generados se guardan como `.mmd` en la carpeta local `output/diagrams/`. Si un documento ya tiene un diagrama, la UI permite abrir el existente o generar uno nuevo.

## Historial

El historial se reconstruye leyendo los archivos guardados en disco. Permite:

- Agrupar documentos por video.
- Filtrar por canal, mes, modelo y existencia de diagrama.
- Buscar por titulo.
- Abrir resultados anteriores.
- Descargar Markdown o PDF.
- Ver prompt usado y transcripcion original.
- Consultar metadatos de proveedor, modelo, tokens, duracion y chunking.

## Analitica

La analitica se activa desde Configuracion. Lee los metadatos locales de resultados y diagramas para construir un dataset en memoria.

Incluye:

- KPIs compactos: tokens, tiempo total, tiempo medio, duracion media, palabras input/output, documentos y diagramas.
- Filtros por tipo, canal, proveedor, modelo, prompt, video/documento y mes.
- Graficos de barras verticales y horizontales.
- Scatterplot con ejes configurables y agrupacion por leyenda.
- Heatmap con doble dimension.
- Pie chart para distribuciones.
- Click en graficos para filtrar.

La API tambien incluye endpoints para crear, actualizar y eliminar configuraciones de dashboards.

## API local

Endpoints principales:

```text
GET    /api/providers
GET    /api/models?provider=openai
GET    /api/prompts
POST   /api/prompts
DELETE /api/prompts/:id
GET    /api/diagram-prompts
GET    /api/settings
POST   /api/settings
POST   /api/restart
POST   /api/process
GET    /api/process/:jobId
GET    /api/history
GET    /api/results/:filename
GET    /api/results/:filename/prompt
GET    /api/results/:filename/transcript
GET    /api/pdf/:filename
GET    /api/download/:filename
POST   /api/diagram
GET    /api/diagram/:filename
GET    /api/analytics/settings
GET    /api/analytics/dataset
POST   /api/analytics/dashboards
PUT    /api/analytics/dashboards/:id
DELETE /api/analytics/dashboards/:id
```

## Seguridad y datos locales

- No subas `.env`.
- No subas `config/local.settings.json`.
- No subas `config/analytics.dashboards.json`.
- No subas `output/` si contiene resultados reales, transcripciones o metadatos.
- No subas binarios locales de `yt-dlp`.
- Las API keys no se exponen al frontend.
- El backend solo acepta origenes locales permitidos por CORS.

## Validacion antes de publicar

```bash
npm run typecheck
npm test
npm run build
```

## Notas de mantenimiento

- `output/` es contenido generado y no debe versionarse.
- Los prompts incluidos en `prompts/` si son parte del producto.
- Los cambios en modelos y proveedores viven en `src/server/config/`.
- Los tests estan junto a los modulos que validan.
- Si se anaden nuevos datos generados, revisa `.gitignore` antes de hacer commit.
