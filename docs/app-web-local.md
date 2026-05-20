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

- flujo guiado `Flow`;
- crear/abrir proyecto;
- seleccionar rutas con explorador local del backend;
- anadir jobs;
- ejecutar jobs;
- editar drafts;
- exportar;
- ver historial de proyectos recientes;
- ver providers;
- configurar presets;
- configurar API keys en el backend local;
- ejecutar diagnostico visual.

## Flujo Recomendado

1. Abrir `Flow`.
2. Crear proyecto o abrir `captionflow_project.json` con `Buscar`.
3. Seleccionar video/audio con el explorador local.
4. Confirmar idiomas origen/destino.
5. Anadir job.
6. Ejecutar pipeline.
7. Revisar draft en `Editor`.
8. Exportar desde `Export`.

## Diseno UX

La UI sigue una adaptacion practica de `taste-skill`: app local sobria,
responsive, con grid claro, estados visibles, foco accesible y microinteracciones
CSS ligeras. No se han anadido librerias visuales extra.

## Seguridad de API Keys

La UI solo muestra si una clave esta configurada y una version enmascarada. El
valor completo no se devuelve al navegador.
