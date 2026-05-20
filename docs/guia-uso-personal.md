# Guia de Uso Personal de CaptionFlow

## 1. Preparar Configuracion

Crear una configuracion recomendada para subtitulos y YouTube:

```bash
python -m subtitle_pipeline config init --preset personal-youtube
```

Comprobar entorno:

```bash
python -m subtitle_pipeline doctor
```

## 2. Crear Proyecto

```bash
python -m subtitle_pipeline project create --name Demo --root-dir ./demo
```

## 3. Anadir Video

```bash
python -m subtitle_pipeline project add-job \
  --project ./demo/captionflow_project.json \
  --input ./video.mp4 \
  --source-lang en \
  --target-lang es
```

## 4. Ejecutar Job

Modo local:

```bash
python -m subtitle_pipeline project run \
  --project ./demo/captionflow_project.json \
  --job-id <job-id> \
  --translation-provider nllb \
  --export-profile review
```

Modo API con fallback:

```bash
python -m subtitle_pipeline project run \
  --project ./demo/captionflow_project.json \
  --job-id <job-id> \
  --transcription-fallback-provider openai-whisper \
  --translation-provider nano-gpt \
  --translation-fallback-provider openai \
  --translation-cache \
  --export-profile youtube
```

## 5. Revisar y Editar Draft

Listar segmentos:

```bash
python -m subtitle_pipeline subtitle list --draft ./demo/drafts/<job-id>.json
```

Editar una traduccion:

```bash
python -m subtitle_pipeline subtitle edit \
  --draft ./demo/drafts/<job-id>.json \
  --index 4 \
  --translated "Texto corregido"
```

Validar:

```bash
python -m subtitle_pipeline subtitle validate --draft ./demo/drafts/<job-id>.json
```

## 6. Exportar Resultado Final

```bash
python -m subtitle_pipeline project export \
  --project ./demo/captionflow_project.json \
  --job-id <job-id> \
  --export-profile youtube
```

La salida queda en:

```text
demo/exports/<video>/subtitles/
demo/exports/<video>/metadata/export_manifest.json
```

## 7. Glosario Opcional

Crear `glossary.json`:

```json
{
  "CaptionFlow": "CaptionFlow",
  "voice over": "doblaje"
}
```

Usarlo:

```bash
python -m subtitle_pipeline project run \
  --project ./demo/captionflow_project.json \
  --job-id <job-id> \
  --translation-glossary ./glossary.json
```
