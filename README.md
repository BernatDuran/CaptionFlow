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
- Dependencias Python del archivo `requirements.txt`.
- Clave de Anthropic si se usa el traductor `claude`.

Instalacion basica:

```bash
pip install -r requirements.txt
```

## Uso rapido

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
