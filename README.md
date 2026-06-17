# CaptionFlow

CaptionFlow es una webapp local para convertir vídeos de YouTube en documentos Markdown útiles: resúmenes, análisis, guías paso a paso, diagramas Mermaid y exportaciones en PDF.

La aplicación combina React + Vite en el frontend, Express en el backend, `yt-dlp` para obtener subtítulos/transcripciones y proveedores de IA configurables para generar el documento final. Todo se guarda en el sistema de archivos local, sin base de datos.

## Qué Hace

- Procesa URLs de YouTube normales, `youtu.be` y Shorts.
- Extrae metadatos del vídeo: título, canal, duración, fecha e ID.
- Descarga subtítulos oficiales si existen y usa subtítulos automáticos como fallback.
- Cachea transcripciones por vídeo para no repetir llamadas a `yt-dlp`.
- Genera documentos Markdown con prompts editables.
- Permite usar un prompt personalizado desde la UI sin modificar archivos.
- Genera diagramas Mermaid desde documentos ya creados.
- Muestra historial agrupado por vídeo, con filtros por canal, mes, modelo y diagramas.
- Permite abrir resultados antiguos, ver la transcripción original y ver el prompt usado.
- Exporta resultados como Markdown y PDF.
- Registra métricas de uso: tokens, duración, proveedor/modelo, chunking y runs de diagramas.

## Stack

- Frontend: React 19, Vite 6, TypeScript.
- Backend: Express 5, TypeScript, `tsx`.
- IA: OpenAI, Google Gemini y Nano-GPT.
- Extracción YouTube: `yt-dlp`.
- Markdown: `react-markdown`, `remark-gfm`, `marked`.
- PDF: `pdfkit`.
- Diagramas: Mermaid.

## Requisitos

- Node.js 20 o superior.
- npm.
- `yt-dlp` instalado en el `PATH` o disponible como binario local en `bin/yt-dlp.exe`.
- Una API key del proveedor de IA que quieras usar.

## Instalación

```bash
npm ci
```

Si no tienes `package-lock.json` actualizado o prefieres instalación flexible:

```bash
npm install
```

## Configuración

Copia `.env.example` a `.env` y rellena las claves que necesites:

```env
ACTIVE_PROVIDER=openai
OPENAI_API_KEY=
GOOGLE_API_KEY=
NANOGPT_API_KEY=

# Alias también soportados:
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

Las API keys solo se leen en backend. El frontend únicamente recibe si un proveedor está configurado o no.

La app guarda preferencias no sensibles en:

```text
config/local.settings.json
```

Ahí se guardan el proveedor activo, modelos seleccionados, filtros de contexto, chunking adaptativo y ruta local de almacenamiento. Este archivo está ignorado por Git.

## Instalar yt-dlp

Con Python:

```bash
pip install -U yt-dlp
```

Con Windows:

```bash
winget install yt-dlp.yt-dlp
```

Comprueba la instalación:

```bash
yt-dlp --version
```

CaptionFlow también busca primero un binario local:

```text
bin/yt-dlp.exe
```

Ese binario está ignorado por Git.

## Ejecutar en Local

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

También hay un lanzador Windows:

```text
iniciar_captionflow.bat
```

## Scripts

```bash
npm run dev        # Frontend Vite + backend Express en modo desarrollo
npm run dev:client # Solo frontend
npm run dev:server # Solo backend con watch
npm run typecheck  # TypeScript sin emitir build
npm test           # Tests Node/tsx
npm run build      # TypeScript + build Vite
npm start          # Arranca el servidor compilado
```

## Flujo de Uso

1. Pega una URL de YouTube.
2. Elige un prompt de procesamiento.
3. Opcionalmente edita el prompt para esa ejecución.
4. CaptionFlow valida URL, proveedor, modelo y API key.
5. `yt-dlp` obtiene metadatos y subtítulos.
6. Si ya existe cache para ese vídeo, reutiliza la transcripción.
7. Si el vídeo es largo, la app puede trocear la transcripción y resumir partes.
8. El backend llama al proveedor/modelo activo.
9. El resultado se guarda como Markdown junto con metadatos `.meta.json`.
10. Desde la UI puedes copiar, descargar Markdown/PDF, ver prompt, ver transcripción o generar diagramas.

## Prompts

Los prompts viven en:

```text
prompts/
```

Cada prompt es un Markdown con frontmatter:

```md
---
name: "Resumen ejecutivo"
description: "Genera un resumen claro y estructurado del vídeo"
output_filename_prefix: "resumen"
temperature: 0.3
---

Contenido del prompt aquí...
```

Campos:

- `name`: nombre visible en la UI.
- `description`: ayuda contextual.
- `output_filename_prefix`: prefijo usado para el archivo generado.
- `temperature`: temperatura enviada al proveedor IA.

Los prompts se pueden crear, editar y eliminar desde la pestaña `Prompts` del modal de configuración. La app también admite un prompt personalizado puntual desde la pantalla principal.

## Diagramas Mermaid

Los prompts de diagramas viven en:

```text
prompts/diagrams/
```

Incluye plantillas para:

- `flowchart.md`
- `mindmap.md`
- `timeline.md`
- `sequence.md`

Ejemplo:

```md
---
name: "Diagrama de flujo"
description: "Genera un flowchart Mermaid claro y robusto"
output_filename_prefix: "flowchart"
diagram_type: "flowchart TD"
temperature: 0.2
---

Genera solo código Mermaid válido...
```

Los diagramas se guardan como `.mmd` en la carpeta de salida. Si intentas generar un diagrama de un tipo ya existente, la UI permite abrir el existente o regenerarlo.

## Historial y Exportación

El historial se construye leyendo los archivos guardados en disco. Permite:

- Agrupar documentos por vídeo.
- Filtrar por canal, mes, modelo y existencia de diagrama.
- Buscar por título.
- Abrir resultados antiguos.
- Descargar Markdown.
- Descargar PDF.
- Ver la transcripción original.
- Ver el prompt usado para generar el documento.
- Consultar métricas de tokens y duración.

## Almacenamiento

Por defecto, CaptionFlow escribe en:

```text
output/
  transcripts/
    cache/
    by-video/
  results/
  diagrams/
```

Contenido:

- `output/transcripts/cache`: cache JSON por ID de vídeo.
- `output/transcripts/by-video`: transcripciones canónicas con metadatos.
- `output/results`: documentos `.md` y metadatos `.meta.json`.
- `output/diagrams`: diagramas Mermaid `.mmd`.

Desde configuración puedes cambiar la ruta raíz de almacenamiento. Si defines `outputRootDir`, todas esas subcarpetas se crean en el nuevo destino.

`output/` está ignorado por Git.

## Proveedores y Modelos

Proveedores soportados:

- OpenAI.
- Google Gemini.
- Nano-GPT.

Los modelos se listan desde backend:

- OpenAI: intenta consultar `/v1/models` si hay API key y filtra modelos de texto.
- Gemini: consulta la API de modelos compatibles con `generateContent`.
- Nano-GPT: consulta el catálogo detallado de modelos si hay API key.
- Si una consulta falla o falta API key, usa fallbacks de `src/server/config/modelCatalog.ts`.

El frontend no mantiene modelos hardcodeados. El modal de configuración permite:

- Cambiar proveedor activo.
- Elegir modelo por proveedor.
- Filtrar por contexto mínimo.
- Activar/desactivar chunking adaptativo.
- Recargar `.env` sin reiniciar manualmente el proceso.

## Transcripciones Largas y Chunking

CaptionFlow estima límites usando tokens de contexto conocidos del modelo. Si el documento cabe, envía la transcripción completa al prompt final.

Si la transcripción es demasiado larga:

- Con chunking adaptativo activado, calcula el tamaño de cada parte según el contexto real del modelo.
- Resume partes en paralelo con un límite de concurrencia interno.
- Genera el documento final a partir de los resúmenes intermedios.
- Guarda en metadatos si hubo chunking, cuántas partes se usaron y qué estrategia se aplicó.

Si un modelo no tiene límites conocidos, la UI pide confirmación antes de continuar.

## API Local

Endpoints principales:

```text
GET    /api/providers
GET    /api/models?provider=openai|google|nanogpt
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
GET    /api/download/:filename
GET    /api/pdf/:filename
POST   /api/diagram
GET    /api/diagram/:filename
```

Los trabajos de procesamiento viven en memoria. Si reinicias el backend, se pierden los jobs activos, pero los resultados ya escritos en disco siguen disponibles.

## Seguridad

- `.env`, `config/local.settings.json`, `output`, `dist`, `node_modules` y binarios locales están en `.gitignore`.
- Las API keys nunca se envían al frontend.
- El frontend de desarrollo y la API escuchan por defecto en `127.0.0.1`, no en toda la red local.
- CORS solo permite orígenes locales de desarrollo.
- `yt-dlp` se ejecuta con `spawn` y argumentos separados, sin concatenar comandos.
- Las rutas de descarga se restringen a archivos generados.
- Las rutas internas de transcripciones se resuelven dentro de la carpeta de almacenamiento configurada.
- Los nombres de archivo se sanitizan.
- El backend no necesita login porque está pensado para uso local.

## Tests

```bash
npm run typecheck
npm test
npm run build
```

## Limitaciones

- No hay autenticación ni multiusuario.
- No hay base de datos.
- Los jobs activos son volátiles.
- Depende de que YouTube exponga subtítulos oficiales o automáticos.
- La calidad del resultado depende del prompt y del modelo activo.
- Los PDF son exportaciones generadas desde Markdown; no son documentos maquetados a mano.
