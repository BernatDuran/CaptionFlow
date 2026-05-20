# App Web Local de CaptionFlow

## Objetivo

Usar CaptionFlow desde una interfaz web local sin depender del CLI para el flujo
normal.

## Arranque Facil

La forma recomendada para probar la app en Windows es hacer doble clic en:

```text
CaptionFlow.cmd
```

El lanzador:

1. entra en el repositorio;
2. instala dependencias frontend si falta `web/node_modules`;
3. compila la web con Vite;
4. busca un puerto libre empezando por `8765`;
5. arranca el backend Python;
6. abre el navegador en la URL correcta.

Deja la ventana abierta mientras uses CaptionFlow. Para cerrar la app, pulsa
`Ctrl+C` en esa ventana.

Si `8765` esta ocupado por un servidor antiguo, el lanzador usara `8766`,
`8767`, etc. Usa siempre la URL que imprima la ventana del lanzador.

Si ves en el navegador:

```json
{"error": "Unsupported endpoint: GET /"}
```

estas entrando a un backend antiguo sin frontend servido. Cierra la ventana de
PowerShell anterior que lo arranco, o vuelve a ejecutar `CaptionFlow.cmd` y usa
la URL que abra/imprima el lanzador.

## Arquitectura

```text
App local completa: http://127.0.0.1:8765
Backend Python API:  http://127.0.0.1:8765
Frontend compilado:  servido desde web/dist por el backend
```

El frontend no llama directamente a OpenAI ni guarda claves. Las claves se
configuran en el backend local y se usan desde Python.

## Arranque Manual Para Desarrollo

Si quieres trabajar en modo desarrollo con Vite, puedes seguir usando dos
procesos.

### Backend

```bash
python -m subtitle_pipeline app serve --host 127.0.0.1 --port 8765
```

### Frontend

Desde la carpeta `web`:

```bash
npm install
npm run dev
```

En este modo de desarrollo la URL del frontend es `http://127.0.0.1:5173`.

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
