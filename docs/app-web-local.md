# App Web Local de CaptionFlow

## Objetivo

Usar CaptionFlow desde una interfaz web local sin depender del CLI para el flujo
normal.

## Arquitectura

```text
Backend Python local: http://127.0.0.1:8765
Frontend React/Vite:  http://127.0.0.1:5173
```

El frontend no llama directamente a OpenAI ni guarda claves. Las claves se
configuran en el backend local y se usan desde Python.

## Arrancar Backend

```bash
python -m subtitle_pipeline app serve --host 127.0.0.1 --port 8765
```

## Arrancar Frontend

Desde la carpeta `web`:

```bash
npm install
npm run dev
```

## Funciones Cubiertas

- dashboard local;
- crear/abrir proyecto;
- anadir jobs;
- ejecutar jobs;
- editar drafts;
- exportar;
- ver providers;
- configurar presets;
- configurar API keys en el backend local;
- ejecutar diagnostico visual.

## Seguridad de API Keys

La UI solo muestra si una clave esta configurada y una version enmascarada. El
valor completo no se devuelve al navegador.
