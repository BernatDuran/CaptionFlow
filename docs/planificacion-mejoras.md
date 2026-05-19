# Planificacion de Mejoras de CaptionFlow

## 1. Objetivo

Convertir CaptionFlow en una aplicacion usable, mantenible y extensible para transcribir, traducir, editar, exportar y doblar contenido audiovisual de forma local o semilocal.

La evolucion debe preservar el valor actual del proyecto: un pipeline sencillo basado en Python, `ffmpeg`, Whisper, traduccion y TTS. Las nuevas capacidades se incorporaran por fases, con especificaciones claras, pruebas automatizadas y separacion entre dominio, infraestructura e interfaz.

La aplicacion debe evolucionar hacia una arquitectura **model provider-ready ligera**: los proveedores de IA concretos, como `faster-whisper`, Claude, NLLB o Edge-TTS, deben ser adaptadores intercambiables detras de contratos internos estables. El objetivo no es crear un sistema complejo de plugins en la primera version, sino evitar acoplamientos que dificulten conectar nuevos modelos en el futuro.

## 2. Principios de Desarrollo

- **Spec-driven development**: ninguna funcionalidad relevante se implementa sin una especificacion previa de comportamiento, entradas, salidas, errores y criterios de aceptacion.
- **Cambios incrementales**: cada fase debe dejar la aplicacion en un estado funcional.
- **Separacion de responsabilidades**: dominio audiovisual, adaptadores externos, interfaz, persistencia y orquestacion deben evolucionar como capas separadas.
- **Observabilidad desde el inicio**: logs, estados de progreso, errores recuperables y trazabilidad de jobs.
- **Reproducibilidad**: configuracion versionada, dependencias fijadas y comandos documentados.
- **Calidad automatizada**: tests unitarios, tests de integracion ligeros, linting, type checking y CI.
- **Experiencia de usuario pragmatica**: priorizar flujos reales de trabajo por encima de opciones avanzadas prematuras.
- **Provider-ready ligero**: transcripcion, traduccion y TTS deben depender de interfaces internas, no de proveedores hardcodeados en los casos de uso.
- **Trazabilidad de IA**: cada resultado generado por IA debe poder asociarse al proveedor, modelo, version/configuracion y parametros principales usados.

## 3. Alcance Funcional Objetivo

CaptionFlow deberia cubrir estos flujos principales:

1. Importar un archivo de video o audio.
2. Validar entorno, dependencias y compatibilidad del archivo.
3. Transcribir audio a segmentos temporizados.
4. Traducir segmentos manteniendo sincronizacion.
5. Editar texto y tiempos de subtitulos.
6. Previsualizar subtitulos sobre el video.
7. Exportar subtitulos, audio doblado y video final.
8. Procesar varios trabajos con historial, reintentos y estados.
9. Configurar modelos, idiomas, voces, formatos y perfiles de exportacion.
10. Seleccionar proveedor y modelo por tarea: transcripcion, traduccion y TTS.
11. Consultar capacidades, requisitos, coste aproximado y limitaciones de cada proveedor disponible.

## 4. Arquitectura Tecnica Objetivo

### 4.1 Capas

- **Dominio**: modelos puros de `MediaAsset`, `Transcript`, `SubtitleSegment`, `TranslationJob`, `ExportProfile`, `DubbingJob`.
- **Casos de uso**: servicios de alto nivel: transcribir, traducir, exportar, doblar, quemar subtitulos, validar entorno.
- **Adaptadores**: integraciones con `ffmpeg`, `faster-whisper`, Claude, NLLB, Edge-TTS y sistema de archivos.
- **Proveedores IA**: adaptadores intercambiables para transcripcion, traduccion y TTS, registrados mediante configuracion interna simple.
- **Persistencia**: almacenamiento de proyectos, jobs, configuraciones y resultados.
- **Interfaz**: CLI actual, futura UI local y API interna.
- **Infraestructura**: logging, cola de trabajos, configuracion, gestion de errores, CI/CD.

### 4.2 Capa de Proveedores IA

La capa de proveedores IA debe permitir conectar varios modelos sin modificar los casos de uso principales.

Contratos minimos:

- `TranscriptionProvider`: convierte audio en segmentos temporizados.
- `TranslationProvider`: traduce segmentos manteniendo cardinalidad y orden.
- `TTSProvider`: genera audio por segmento o por bloque textual.
- `ProviderConfig`: define proveedor, modelo, credenciales, parametros y limites.
- `ProviderCapabilities`: expone idiomas, modos soportados, coste estimado, requisitos de red/GPU y formatos de entrada/salida.
- `ProviderResultMetadata`: registra proveedor, modelo, parametros relevantes, duracion, coste estimado y advertencias.

Proveedores iniciales:

- Transcripcion: `faster-whisper`.
- Traduccion: Claude y NLLB.
- TTS: Edge-TTS.

Proveedores futuros posibles:

- Transcripcion: OpenAI Whisper API, whisper.cpp, AssemblyAI.
- Traduccion: OpenAI, DeepL, Google Translate, modelos locales.
- TTS: OpenAI TTS, Azure TTS, ElevenLabs, motores locales.

### 4.3 Buenas Practicas

- Usar tipos explicitos y dataclasses o modelos validados para estructuras de datos.
- Evitar que la CLI contenga logica de negocio.
- Encapsular llamadas externas tras interfaces testeables.
- Mantener funciones puras para formateo, transformacion y validacion.
- No mezclar rutas temporales, rutas de salida y estado de job en una misma capa.
- Definir errores propios: `DependencyMissingError`, `TranscriptionError`, `TranslationError`, `ExportError`, `ValidationError`.
- Evitar dependencias pesadas obligatorias si solo se usan en modos opcionales.
- No hardcodear modelos concretos dentro de casos de uso.
- Normalizar errores, capacidades, metadatos y resultados entre proveedores.
- Usar dobles de prueba para proveedores IA en tests unitarios.
- Mantener credenciales fuera del codigo y de los artefactos exportados.

## 5. Fases de Implementacion

## Fase 0: Estabilizacion del Proyecto Base

### Objetivo Funcional

Garantizar que la funcionalidad actual se puede instalar, ejecutar y verificar de forma fiable.

### Entregables Funcionales

- Comando de ayuda claro.
- Ejemplo minimo documentado con archivo de prueba.
- Salidas esperadas documentadas.
- Mensajes de error comprensibles para dependencias ausentes.

### Entregables Tecnicos

- Crear especificacion inicial en `docs/specs/current-pipeline.md`.
- Anadir tests unitarios para formateo SRT/VTT/TXT.
- Anadir tests de configuracion y validacion de parametros.
- Anadir `ruff`, `mypy` o `pyright`, y `pytest`.
- Definir CI con instalacion, lint, type check y tests.
- Revisar `requirements.txt` y separar dependencias base/opcionales si aplica.

### Criterios de Aceptacion

- El proyecto instala en un entorno limpio.
- La CLI muestra ayuda sin cargar modelos pesados.
- Los tests locales pasan.
- Las funciones principales tienen contratos documentados.

## Fase 1: Especificacion y Modelo de Dominio

### Objetivo Funcional

Definir con precision que es un proyecto, un job, un segmento, una traduccion, una exportacion y un proveedor IA.

### Entregables Funcionales

- Especificacion de flujos principales.
- Estados de job: `pending`, `running`, `completed`, `failed`, `cancelled`.
- Definicion de formatos soportados y restricciones.
- Definicion de idiomas, voces y perfiles de salida.
- Definicion funcional de proveedores disponibles por tarea.
- Reglas de seleccion de proveedor/modelo por defecto.

### Entregables Tecnicos

- Crear modelos de dominio independientes de CLI e infraestructura.
- Introducir capa de casos de uso.
- Crear interfaces para transcriptor, traductor, TTS y exportador.
- Crear contratos `TranscriptionProvider`, `TranslationProvider`, `TTSProvider`, `ProviderConfig`, `ProviderCapabilities` y `ProviderResultMetadata`.
- Adaptar `faster-whisper`, Claude, NLLB y Edge-TTS a esos contratos.
- Definir estructura de errores recuperables y no recuperables.
- Documentar contratos de entrada/salida de cada servicio.

### Criterios de Aceptacion

- La CLI usa casos de uso, no implementaciones directas.
- Los servicios externos pueden ser sustituidos por dobles en tests.
- Las reglas de negocio estan cubiertas por tests unitarios.
- Anadir un proveedor nuevo no requiere modificar el flujo principal del pipeline.

## Fase 2: Instalacion, Diagnostico y Configuracion

### Objetivo Funcional

Reducir friccion de uso detectando problemas antes de lanzar procesos largos.

### Entregables Funcionales

- Comando `doctor` para validar entorno.
- Deteccion de `ffmpeg`, Python, GPU, paquetes y claves API.
- Deteccion de proveedores IA disponibles, credenciales requeridas, conectividad, modelos locales y capacidades.
- Configuracion persistente de idioma, modelo, traductor, voz y carpeta de salida.
- Configuracion persistente de proveedor/modelo por tarea.
- Mensajes accionables ante errores.

### Entregables Tecnicos

- Servicio `EnvironmentChecker`.
- Servicio `ProviderRegistry` para listar proveedores disponibles y capacidades.
- Sistema de configuracion versionado.
- Validadores de entrada para archivos, rutas, formatos e idiomas.
- Validadores de credenciales, conectividad y requisitos por proveedor.
- Tests de diagnostico con mocks del sistema.

### Criterios de Aceptacion

- El usuario puede saber si su equipo esta listo antes de procesar un video.
- Los errores de dependencia no aparecen tarde en mitad del pipeline.
- La configuracion se puede inspeccionar y resetear.
- La aplicacion puede explicar por que un proveedor/modelo no esta disponible.

## Fase 3: Gestion de Proyectos y Cola de Trabajos

### Objetivo Funcional

Permitir trabajo continuado con varios videos, historial y recuperacion de errores.

### Entregables Funcionales

- Crear y abrir proyectos.
- Anadir multiples archivos a una cola.
- Ver progreso por etapa.
- Reintentar jobs fallidos.
- Guardar resultados y metadatos.
- Guardar proveedor, modelo, parametros y metadatos IA usados en cada job.

### Entregables Tecnicos

- Persistencia local con SQLite o archivos JSON versionados.
- Modelo `Project` y `Job`.
- Orquestador de jobs con estados y eventos.
- Logs por job.
- Metadatos reproducibles de proveedor/modelo por etapa.
- Separacion de directorios: entrada, temporales, salida y metadatos.

### Criterios de Aceptacion

- Un job interrumpido conserva estado suficiente para diagnostico.
- El historial permite localizar outputs generados.
- La cola procesa trabajos de forma secuencial de manera fiable.
- Un resultado puede auditarse para saber con que proveedor/modelo se genero.

## Fase 4: Editor de Subtitulos

### Objetivo Funcional

Permitir revisar y corregir el resultado antes de exportar.

### Entregables Funcionales

- Editar texto original y traducido.
- Ajustar inicio y fin de segmentos.
- Unir, dividir y eliminar segmentos.
- Validar solapes, duraciones minimas y segmentos vacios.
- Guardar borradores.

### Entregables Tecnicos

- Especificacion de reglas de edicion.
- Servicio de validacion temporal.
- Modelo de cambios o snapshots para deshacer/rehacer.
- Tests de operaciones sobre segmentos.

### Criterios de Aceptacion

- Las ediciones no rompen la exportacion.
- Los errores temporales se detectan antes de generar archivos.
- Se puede guardar y reabrir una version editada.

## Fase 5: Previsualizacion y UI Local

### Objetivo Funcional

Hacer la aplicacion usable sin consola para flujos comunes.

### Entregables Funcionales

- Pantalla de importacion.
- Selector de idioma, modelo, traductor, formatos y voz.
- Selector de proveedor/modelo por tarea con valores recomendados.
- Vista de progreso.
- Reproductor con subtitulos.
- Panel de edicion basico.
- Acciones de exportacion.
- Avisos visibles de coste, privacidad, red y requisitos locales cuando apliquen.

### Entregables Tecnicos

- Definir si la UI sera web local, escritorio o hibrida.
- Exponer API interna para proyectos, jobs y resultados.
- Separar proceso pesado del proceso de UI.
- Gestionar cancelacion y progreso mediante eventos.
- Exponer capacidades de proveedores a la UI sin acoplarla a proveedores concretos.
- Tests de componentes criticos y flujo end-to-end minimo.

### Criterios de Aceptacion

- Un usuario puede importar, procesar, revisar y exportar desde la UI.
- La UI no se bloquea durante tareas largas.
- Los errores se muestran con mensajes claros.
- La UI puede cambiar proveedor/modelo sin cambiar la logica del pipeline.

## Fase 6: Exportacion Profesional

### Objetivo Funcional

Adaptar salidas a herramientas y plataformas reales.

### Entregables Funcionales

- Perfiles para YouTube, TikTok, Premiere, DaVinci y CapCut.
- Exportacion `srt`, `vtt`, `ass`, `txt`, audio y video final.
- Estilos configurables para subtitulos quemados.
- Nombres de archivo consistentes.

### Entregables Tecnicos

- Modelo `ExportProfile`.
- Exportadores desacoplados por formato.
- Tests de snapshots para formatos de subtitulos.
- Validacion de compatibilidad por perfil.

### Criterios de Aceptacion

- Cada perfil genera salidas documentadas y repetibles.
- Los formatos exportados pasan validaciones basicas.
- La generacion de video no altera innecesariamente calidad o duracion.

## Fase 7: Traduccion Robusta y Glosarios

### Objetivo Funcional

Mejorar calidad, consistencia y fiabilidad de traduccion con soporte para multiples proveedores.

### Entregables Funcionales

- Glosarios personalizados por proyecto.
- Conservacion estricta de numero de segmentos.
- Reintentos ante fallos de API.
- Deteccion de traducciones vacias o desalineadas.
- Comparacion original/traduccion.
- Seleccion de proveedor de traduccion por proyecto o job.
- Politicas de coste, privacidad y fallback por proveedor.

### Entregables Tecnicos

- Contrato de traductor por lotes con validacion de longitud.
- Parser robusto de respuestas numeradas o estructuradas.
- Politicas de retry con backoff.
- Tests con respuestas malformadas.
- Registro de coste estimado si se usa API externa.
- Adaptadores de traduccion desacoplados del pipeline.
- Tests compartidos que todo `TranslationProvider` debe pasar.

### Criterios de Aceptacion

- Una traduccion no puede completar si pierde segmentos sin avisar.
- Los glosarios se aplican de forma verificable.
- Los errores temporales pueden reintentarse sin repetir todo el pipeline.
- Un proveedor de traduccion nuevo puede integrarse cumpliendo el contrato comun.

## Fase 8: Doblaje TTS Mejorado

### Objetivo Funcional

Hacer el doblaje mas natural y controlable mediante proveedores TTS intercambiables, sin depender de conversion de voz externa.

### Entregables Funcionales

- Selector de voces por idioma.
- Selector de proveedor TTS.
- Control de velocidad, volumen y pausas.
- Ajuste de duracion por segmento.
- Mezcla con audio original atenuado.
- Exportacion de pista doblada separada.

### Entregables Tecnicos

- Servicio TTS desacoplado.
- Adaptador Edge-TTS con validacion de formato real de salida.
- Contrato comun para proveedores TTS.
- Tests compartidos que todo `TTSProvider` debe pasar.
- Normalizacion y conversion explicita de audio.
- Mezclador con parametros configurables.
- Tests con segmentos sinteticos y archivos pequenos.

### Criterios de Aceptacion

- El audio generado mantiene sincronizacion aceptable.
- El sistema produce formatos de audio esperados.
- La mezcla final conserva duracion y video original.
- Un proveedor TTS nuevo puede integrarse sin modificar el caso de uso de doblaje.

## Fase 9: Configuracion Avanzada de Modelos y Proveedores

### Objetivo Funcional

Permitir equilibrar calidad, velocidad, privacidad y coste segun el equipo del usuario y los proveedores disponibles.

### Entregables Funcionales

- Seleccion guiada de modelos Whisper.
- Seleccion guiada de proveedor/modelo para transcripcion, traduccion y TTS.
- Deteccion y uso de GPU si esta disponible.
- Estimacion de tiempo aproximado.
- Estimacion de coste aproximado para proveedores API.
- Indicacion de privacidad: local, remoto o mixto.
- Modo rapido y modo calidad.

### Entregables Tecnicos

- Servicio de capacidades del sistema.
- Servicio de capacidades de proveedores.
- Perfilado basico de rendimiento.
- Configuracion por proyecto y global.
- Politicas de fallback entre proveedores compatibles.
- Normalizacion de parametros comunes y parametros especificos por proveedor.
- Tests para seleccion de perfiles.

### Criterios de Aceptacion

- El usuario entiende el coste de cada configuracion.
- La aplicacion no selecciona por defecto opciones inviables para el equipo.
- El modo CPU sigue siendo funcional.
- Cambiar de proveedor/modelo no requiere cambios de codigo en los casos de uso.
- Las limitaciones de cada proveedor se muestran antes de ejecutar jobs largos.

## Fase 10: Endurecimiento, Distribucion y Mantenimiento

### Objetivo Funcional

Preparar la aplicacion para uso recurrente y evolucion sostenida.

### Entregables Funcionales

- Guia de instalacion completa.
- Guia de solucion de problemas.
- Versionado semantico.
- Changelog.
- Paquetes o instaladores si aplica.

### Entregables Tecnicos

- CI completo.
- Tests de integracion con fixtures pequenas.
- Analisis estatico obligatorio.
- Politica de releases.
- Plantillas de issues y PR.
- Documentacion de arquitectura.

### Criterios de Aceptacion

- Cada release se puede reconstruir.
- Las regresiones comunes quedan cubiertas por tests.
- La documentacion permite instalar y usar sin intervencion del desarrollador.

## 6. Backlog Priorizado

| Prioridad | Funcionalidad | Fase | Dificultad | Impacto |
| ---: | --- | --- | --- | --- |
| 1 | Estabilizacion, tests y diagnostico base | 0-2 | Media | Muy alto |
| 2 | Arquitectura provider-ready ligera | 1-2 | Media | Muy alto |
| 3 | Interfaz visual local | 5 | Alta | Muy alto |
| 4 | Editor de subtitulos | 4 | Alta | Muy alto |
| 5 | Cola de trabajos e historial | 3 | Alta | Alto |
| 6 | Previsualizacion de video | 5 | Media-alta | Alto |
| 7 | Exportacion profesional | 6 | Media | Alto |
| 8 | Traduccion robusta y glosarios | 7 | Media | Alto |
| 9 | Doblaje TTS mejorado | 8 | Alta | Alto |
| 10 | Configuracion avanzada de modelos y proveedores | 9 | Media | Alto |
| 11 | Distribucion y mantenimiento | 10 | Media | Alto |

### 6.1 Estado de Avance

| Avanzado | Cumplimiento | Item | Fase | Resumen | Evidencia actual |
| --- | ---: | --- | --- | --- | --- |
| X | 80% | Estabilizacion, tests y diagnostico base | 0-2 | Base de calidad, especificacion, validacion, diagnostico por perfiles opcionales, config persistente y CLI minima. | `docs/specs/current-pipeline.md`, `pytest`, `ruff`, `validation.py`, `doctor.py`, `app_config.py`, `pyproject.toml` extras, CLI `config` |
| X | 85% | Arquitectura provider-ready ligera | 1-2 | Contratos, registry, factories, inyeccion de providers, seleccion provider/modelo por tarea, errores propios y resultado trazable. | `providers/`, `create_*_provider`, `SubtitleConfig` provider-aware, `PipelineResult`, tests de pipeline con providers falsos |
|  | 0% | Interfaz visual local | 5 | UI para importar, configurar, procesar, revisar y exportar. | Pendiente |
| X | 60% | Editor de subtitulos | 4 | Nucleo de edicion puro integrado con proyectos/jobs: texto, tiempos, borrar, unir, dividir, ordenar, snapshots, validacion temporal, borradores JSON y proteccion antes de exportar. | `subtitle_editor.py`, `save_job_subtitle_draft`, `load_job_subtitle_draft`, `write_subtitles` con validacion, tests unitarios |
| X | 45% | Cola de trabajos e historial | 3 | Proyectos, jobs, estados reales, persistencia, orquestador minimo y eventos de progreso reutilizables por CLI/UI. | `projects.py`, `job_runner.py`, `progress.py`, CLI `project`, persistencia JSON |
|  | 0% | Previsualizacion de video | 5 | Reproductor con subtitulos y feedback antes de exportar. | Pendiente |
|  | 0% | Exportacion profesional | 6 | Perfiles para plataformas y formatos profesionales. | Pendiente |
| X | 30% | Traduccion robusta y glosarios | 7 | Base tecnica para proveedores de traduccion intercambiables usados por el pipeline. | `TranslationProvider`, `create_translation_provider`, registry `claude`/`nllb` |
| X | 30% | Doblaje TTS mejorado | 8 | Base tecnica para proveedores TTS intercambiables usados por doblaje. | `TTSProvider`, `create_tts_provider`, registry `edge-tts` |
| X | 70% | Configuracion avanzada de modelos y proveedores | 9 | Capacidades, disponibilidad, requisitos, seleccion provider/modelo por transcripcion, traduccion y TTS, validacion provider-aware, errores propios y metadata de ejecucion. | `ProviderCapabilities`, `ProviderAvailabilityCheck`, `SubtitleConfig`, CLI provider flags, `ProviderResultMetadata`, `PipelineResult` |
| X | 20% | Distribucion y mantenimiento | 10 | Primer paso de empaquetado mantenible con extras opcionales y dependencias pesadas desacopladas. | `pyproject.toml` extras, `requirements.txt` perfil completo, README de instalacion |

## 7. Orden Recomendado

El orden recomendado no es construir primero la UI, sino estabilizar el nucleo:

1. Fase 0: estabilizar y probar lo existente.
2. Fase 1: definir dominio y contratos.
3. Fase 2: diagnostico de entorno.
4. Fase 3: proyectos y jobs.
5. Fase 4: editor de subtitulos.
6. Fase 5: UI local y previsualizacion.
7. Fases 6-9: capacidades avanzadas y seleccion de proveedores.
8. Fase 10: distribucion, release y mantenimiento.

Este orden reduce riesgo tecnico: primero se convierte el pipeline actual en una base fiable, despues se construyen experiencias de usuario sobre contratos estables.

## 8. Riesgos Principales

- **Modelos pesados**: Whisper y NLLB pueden ser lentos o dificiles de instalar.
- **Dependencias externas**: `ffmpeg`, APIs y Edge-TTS pueden fallar por entorno o red.
- **Sincronizacion audiovisual**: doblaje y subtitulos requieren validacion temporal cuidadosa.
- **Complejidad de UI**: una interfaz prematura puede acoplarse demasiado al pipeline actual.
- **Costes API**: la traduccion externa debe controlar errores, limites y gasto.
- **Vendor lock-in**: acoplar el producto a un unico proveedor dificultaria evolucionar.
- **Cambios de API**: proveedores externos pueden cambiar modelos, precios, limites o formatos.
- **Privacidad**: proveedores remotos pueden implicar envio de audio, texto o metadatos fuera del equipo local.

## 9. Mitigaciones

- Mantener modo CLI funcional durante toda la evolucion.
- Aislar adaptadores externos tras interfaces.
- Usar fixtures pequenas para tests de integracion.
- Implementar validaciones antes de tareas largas.
- Guardar estado de jobs para permitir reintentos.
- Documentar decisiones tecnicas en ADRs breves.
- Definir contratos internos antes de anadir proveedores nuevos.
- Usar tests comunes por tipo de proveedor.
- Registrar proveedor, modelo, parametros, coste estimado y advertencias por job.
- Permitir fallbacks configurables entre proveedores compatibles.
- Mostrar implicaciones de privacidad y red antes de ejecutar proveedores remotos.

## 10. Definicion de Hecho por Fase

Una fase se considera completada cuando:

- Tiene especificacion aprobada o documentada.
- Tiene criterios de aceptacion verificables.
- Incluye tests proporcionales al riesgo.
- Actualiza README o documentacion tecnica.
- Mantiene compatibilidad con los flujos existentes salvo decision explicita.
- No introduce dependencias obligatorias innecesarias.
- Deja el repositorio en estado ejecutable.
- Si anade una integracion IA, implementa el contrato comun correspondiente.
- Documenta capacidades, requisitos, errores, coste aproximado y consideraciones de privacidad del proveedor.
- Incluye tests con dobles o fixtures que no dependan de servicios remotos por defecto.
