# Subtitle Pipeline

Herramienta local para generar subtitulos traducidos desde archivos de video o audio. Tambien puede incrustar los subtitulos en el video y crear una version doblada usando TTS.

## Utilidad

Este proyecto sirve para automatizar un flujo completo de localizacion audiovisual:

- Extraer el audio de un video o archivo multimedia.
- Transcribir el contenido hablado con `faster-whisper`.
- Traducir la transcripcion a otro idioma usando Claude o NLLB local.
- Exportar subtitulos en formatos `srt`, `vtt` o `txt`.
- Generar un video con subtitulos incrustados.
- Generar un video doblado con Edge-TTS.

Es util para traducir videos, preparar subtitulos para edicion y crear versiones dobladas de contenido audiovisual.

## Requisitos

- Python 3.10 o superior.
- `ffmpeg` instalado y disponible en el `PATH`.
- Clave de Anthropic si se usa el traductor `claude`.

Instalacion ligera para usar CLI, configuracion, proyectos y editor:

```bash
pip install -e .
```

Instalacion por perfiles:

```bash
pip install -e ".[media,transcription,translation-api]"
pip install -e ".[media,transcription,translation-local]"
pip install -e ".[media,transcription,translation-api,tts,dubbing]"
```

Instalacion completa equivalente al flujo actual:

```bash
pip install -r requirements.txt
```

Perfiles disponibles:

| Extra | Incluye |
| --- | --- |
| `media` | Extraccion y procesamiento con `ffmpeg-python` |
| `transcription` | `faster-whisper` y `torch` |
| `translation-api` | Traduccion remota con Anthropic |
| `translation-local` | Traduccion local con NLLB, Transformers y SentencePiece |
| `tts` | Sintesis con Edge-TTS |
| `dubbing` | Mezcla de audio con NumPy, SoundFile y Librosa |
| `all` | Todas las dependencias anteriores |

## Uso rapido

### App local con doble clic

En Windows, la forma mas facil de probar la interfaz es hacer doble clic en:

```text
CaptionFlow.cmd
```

El lanzador prepara el frontend, arranca el backend local y abre:

```text
http://127.0.0.1:8765
```

Deja la ventana del lanzador abierta mientras uses la app. Para cerrar
CaptionFlow, pulsa `Ctrl+C` en esa ventana.

Guia detallada: `docs/app-web-local.md`.

Generar subtitulos traducidos de ingles a espanol:

```bash
python -m subtitle_pipeline --input "video.mp4" --source-lang en --target-lang es --output-dir "./out"
```

Generar varios formatos:

```bash
python -m subtitle_pipeline --input "video.mp4" --formats srt vtt txt --output-dir "./out"
```

Usar traduccion local con NLLB:

```bash
python -m subtitle_pipeline --input "video.mp4" --translator nllb --source-lang en --target-lang es --output-dir "./out"
```

Usar Claude:

```bash
set ANTHROPIC_API_KEY=<clave_anthropic>
python -m subtitle_pipeline --input "video.mp4" --translator claude --source-lang en --target-lang es --output-dir "./out"
```

Usar nano-gpt/Qwen:

```bash
set NANO_GPT_API_KEY=<clave_nano_gpt>
python -m subtitle_pipeline --input "video.mp4" --translation-provider nano-gpt --source-lang en --target-lang es --output-dir "./out"
```

## Subtitulos incrustados

Para crear un video final con los subtitulos quemados en la imagen:

```bash
python -m subtitle_pipeline --input "video.mp4" --source-lang en --target-lang es --burn-in --output-dir "./out"
```

Salida esperada:

```text
out/video.srt
out/video_subtitled.mp4
```

## Doblaje

Para generar un video doblado con Edge-TTS:

```bash
python -m subtitle_pipeline --input "video.mp4" --source-lang en --target-lang es --dub --output-dir "./out"
```

Para usar una voz concreta:

```bash
python -m subtitle_pipeline --input "video.mp4" --dub --tts-voice "es-ES-AlvaroNeural" --tts-rate 0 --output-dir "./out"
```

Salida esperada:

```text
out/video.srt
out/video_dubbed.mp4
```

## Opciones principales

| Opcion | Descripcion | Valor por defecto |
| --- | --- | --- |
| `--input` | Archivo de video o audio de entrada | Requerido |
| `--source-lang` | Idioma original | `en` |
| `--target-lang` | Idioma de salida | `es` |
| `--output-dir` | Carpeta de salida | `./output` |
| `--model-size` | Modelo de Whisper | `large-v3` |
| `--transcription-provider` | Proveedor de transcripcion | `faster-whisper` |
| `--transcription-model` | Modelo de transcripcion | Valor de `--model-size` |
| `--device` | `auto`, `cuda` o `cpu` | `auto` |
| `--formats` | Formatos de subtitulos: `srt`, `vtt`, `txt` | `srt` |
| `--translator` | Motor de traduccion: `claude` o `nllb` | `claude` |
| `--translation-provider` | Proveedor de traduccion, reemplaza `--translator` | `claude` |
| `--translation-model` | Modelo de traduccion opcional | Modelo por defecto del proveedor |
| `--api-key` | Clave API de Anthropic | Variable `ANTHROPIC_API_KEY` |
| `--burn-in` | Incrusta subtitulos en el video | Desactivado |
| `--dub` | Genera video doblado | Desactivado |
| `--tts-provider` | Proveedor TTS | `edge-tts` |
| `--tts-model` | Modelo TTS | `edge-tts` |
| `--tts-voice` | Voz de Edge-TTS | `es-ES-AlvaroNeural` |
| `--tts-rate` | Velocidad TTS de `-100` a `100` | `0` |

## Estructura

```text
subtitle_pipeline/
  audio_extractor.py   # Extraccion de audio con ffmpeg
  transcriber.py       # Transcripcion con faster-whisper
  translator.py        # Traduccion con Claude o NLLB
  formatter.py         # Exportacion SRT, VTT y TXT
  pipeline.py          # Orquestacion principal
  tts.py               # Sintesis de voz con Edge-TTS
  audio_mixer.py       # Mezcla y reemplazo de audio
  dubbing.py           # Pipeline de doblaje
```

## Notas

- El traductor por defecto es Claude, por lo que necesita una API key si el idioma origen y destino son distintos.
- Si `source-lang` y `target-lang` son iguales, el pipeline no traduce y exporta la transcripcion original.
