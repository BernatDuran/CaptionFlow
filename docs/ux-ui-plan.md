# Plan UX/UI de CaptionFlow

## 1. Objetivo

Construir una app local completa, util y agradable para uso personal: importar
videos, transcribir, traducir, revisar subtitulos y exportar resultados sin
depender del CLI.

No se busca industrializar, multiusuario ni SaaS. Se busca una herramienta de
escritorio/local clara, robusta y rapida de usar.

## 2. Principios de UX

- Flujo guiado de principio a fin.
- Menos configuracion visible por defecto.
- Estado siempre claro: pendiente, ejecutando, necesita revision, exportado.
- Edicion de subtitulos como pantalla central.
- Configuracion avanzada escondida hasta que haga falta.
- Salidas orientadas a uso real: YouTube, revision y archivo.

## 3. Arquitectura Recomendada

| Capa | Recomendacion |
| --- | --- |
| Backend local | API interna Python/FastAPI o similar |
| Frontend | React + Vite + Tailwind o CSS modules |
| Estado | Proyecto JSON actual como fuente inicial |
| Jobs | Ejecucion local secuencial, sin cola compleja |
| Distribucion | App local primero; empaquetado despues |

Para uso personal, empezaria con una web local servida desde el backend. Tauri o
Electron se pueden valorar despues si abrir navegador molesta.

## 4. Navegacion Principal

| Vista | Funcion |
| --- | --- |
| Dashboard | Proyectos recientes, crear proyecto, abrir proyecto |
| Proyecto | Lista de videos/jobs y estado |
| Nuevo Job | Seleccionar video, idiomas, preset |
| Ejecucion | Progreso por fases y errores accionables |
| Editor | Revisar y editar subtitulos |
| Exportar | Elegir perfil y generar archivos |
| Ajustes | Providers, API keys, cache, glosario |

## 5. Pantalla Editor

Debe ser la pantalla mas cuidada.

Layout recomendado:

```text
Video / audio preview
Timeline simple
Lista editable de segmentos
Panel lateral de validacion y acciones
```

Funciones clave:

- editar texto original/traducido;
- buscar segmentos;
- validar solapes, vacios y duraciones;
- split/merge;
- shift de tiempos;
- guardar draft;
- exportar desde el draft revisado.

## 6. Flujo Ideal

1. Crear/abrir proyecto.
2. Arrastrar video.
3. Elegir preset: `YouTube traducido`, `Revision local`, `Archivo`.
4. Ejecutar.
5. Revisar errores detectados.
6. Editar subtitulos.
7. Exportar.
8. Abrir carpeta de salida.

## 7. MVP UI

| Prioridad | Entregable |
| ---: | --- |
| 1 | API interna para proyectos/jobs/config |
| 2 | Dashboard + vista proyecto |
| 3 | Crear job y ejecutar pipeline |
| 4 | Visor/editor de drafts |
| 5 | Exportar desde draft |
| 6 | Pantalla ajustes/providers |
| 7 | Integrar doctor visual |

## 8. Diseño Visual

Estilo recomendado:

- sobrio, utilitario, tipo herramienta de edicion;
- fondo claro o gris neutro;
- buen contraste;
- tablas densas pero limpias;
- botones con iconos para editar, dividir, fusionar, validar y exportar;
- estados con color discreto: pendiente, running, necesita revision, exportado.

Evitaria una landing page, hero o estetica marketing. La primera pantalla debe
ser la herramienta.

## 9. Riesgos

| Riesgo | Mitigacion |
| --- | --- |
| UI acoplada al pipeline | Crear API interna antes del frontend |
| Edicion complicada | Reusar `subtitle_editor.py` como dominio |
| Jobs largos bloqueando UI | Eventos/progreso y ejecucion en background simple |
| Demasiados settings | Presets primero, avanzado despues |

## 10. Plan de Implementacion

### Fase UI-1: API Interna

- endpoints para proyectos;
- endpoints para jobs;
- endpoint para ejecutar job;
- endpoint para cargar/guardar draft;
- endpoint para exportar.

Estado: implementacion inicial disponible en `subtitle_pipeline/local_api.py`.

### Fase UI-2: App Base

- layout principal;
- dashboard;
- vista proyecto;
- crear job.

Estado: scaffold inicial React/Vite disponible en `web/`.

### Fase UI-3: Editor

- lista de segmentos editable;
- validacion visual;
- acciones split/merge/delete/shift;
- guardado draft.

### Fase UI-4: Exportacion y Ajustes

- perfiles de exportacion;
- glosario;
- cache;
- providers/API keys;
- doctor visual.

Estado: pantalla inicial de ajustes incluida en el frontend.
