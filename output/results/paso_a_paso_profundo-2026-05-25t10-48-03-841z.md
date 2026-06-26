# Guía Técnica: Automatización de Evaluaciones y Control de Agentes con Microsoft Foundry

## Resumen Inicial
Este documento estructura el flujo completo de desarrollo, evaluación y puesta en producción de un agente de IA programador utilizando Microsoft Foundry. Se detalla cómo pasar de una configuración básica en VS Code a un agente validado, seguro y listo para producción mediante observabilidad con trazas OTel, evaluaciones automatizadas con IA y pruebas de equipo rojo (Red Team). El enfoque didáctico explica el orden lógico de cada fase, su impacto en la calidad del agente y cómo aplicar controles nativos para corregir fallos de cumplimiento. Se incluyen las herramientas, pantallas y configuraciones exactas mostradas, junto con dependencias críticas y advertencias operativas para replicar el proceso con precisión.

---

## Explicación por Fases o Bloques Lógicos

### Fase 1: Configuración Inicial y Pruebas Manuales
- **Qué se explica:** Instalación y configuración del agente en Visual Studio Code utilizando el Foundry SDK, definición de herramientas externas y locales, y ejecución de pruebas manuales iniciales.
- **Por qué es importante:** Establece la base funcional del agente. Sin una integración correcta de herramientas y un flujo de ejecución validado manualmente, las evaluaciones automatizadas generarán ruido o fallos estructurales.
- **Pasos concretos:**
  1. Abrir el proyecto en `Visual Studio Code`.
  2. Utilizar `Foundry SDK` para inicializar el agente.
  3. Definir herramientas principales: `WebSearch` y `CodeInterpreter`.
  4. Configurar herramientas locales: interacción con sistema de archivos, `Git`, depuración, registro de logs, búsqueda local y ejecución de scripts.
  5. Escribir la línea principal del SDK que instancia el agente, añade las herramientas y define el nombre de despliegue.
  6. Iniciar una prueba manual para verificar el flujo básico.
- **Errores, riesgos o dependencias:**
  - Dependencia crítica de la correcta declaración de herramientas en el SDK.
  - Riesgo de omitir validaciones manuales previas, lo que provoca fallos en cascada durante las evaluaciones automatizadas.
  - *Pendiente de validar:* La sintaxis exacta de la línea principal del SDK puede variar según la versión del SDK instalada.

### Fase 2: Observabilidad y Seguimiento (Traces & Monitoring)
- **Qué se explica:** Uso del portal de Microsoft Foundry para visualizar trazas de ejecución y métricas operativas en tiempo real.
- **Por qué es importante:** Permite depurar sesiones completas, entender la lógica de decisión del agente, monitorizar costos y detectar patrones de error antes de escalar a evaluaciones formales.
- **Pasos concretos:**
  1. Acceder al portal de `Microsoft Foundry` → seleccionar el agente → pestaña `Traces`.
  2. Revisar trazas `OTel` (respaldadas por `Azure Monitor`) ordenadas por ejecución más reciente.
  3. Hacer clic en un ID de traza para expandir: inputs/outputs, mensaje del sistema, entrada del usuario, lógica del agente, stack tecnológico, características de la app y salidas de herramientas.
  4. Cambiar a la pestaña `Monitoring` para visualizar: costo estimado, uso de tokens, número de ejecuciones, tasa de éxito/fallo, consumo de tokens, llamadas a herramientas y tasa de error en el tiempo.
- **Errores, riesgos o dependencias:**
  - Requiere integración previa y activa con `Azure Monitor` y `OpenTelemetry (OTel)`.
  - Sin trazas estructuradas, la revisión de fallos depende de logs estándar, lo que ralentiza el ciclo de mejora.
  - *Pendiente de validar:* La nomenclatura exacta de las métricas en `Monitoring` puede actualizarse en versiones posteriores del portal.

### Fase 3: Evaluación Automatizada con IA
- **Qué se explica:** Creación y ejecución de un flujo de evaluación automatizado para medir calidad y seguridad del agente.
- **Por qué es importante:** Acelera la identificación de fallos de calidad sin intervención manual constante, permitiendo iteraciones rápidas y basadas en datos.
- **Pasos concretos:**
  1. Ir a la pestaña `Evaluations` → clic en `Create`.
  2. Seleccionar tipo `Automated` (evaluación automatizada con IA).
  3. Definir objetivo: agente y versión específica.
  4. Generar datos de prueba: opción `Synthetic dataset` → ingresar prompt `"Create dataset to evaluate coding agent"` → configurar 90 filas → omitir archivo de referencia → confirmar.
  5. Configurar criterios: eliminar evaluadores de coherencia, fluidez y grounding (no aplicables a este agente); mantener los 7 evaluadores de seguridad por defecto.
  6. Revisar configuración y enviar (`Submit`). La ejecución tarda varios minutos.
- **Errores, riesgos o dependencias:**
  - Incluir criterios irrelevantes genera ruido en los reportes y oculta fallos reales.
  - La calidad del dataset sintético depende directamente de la precisión del prompt inicial.
  - *Pendiente de validar:* El nombre exacto del botón de generación de datos sintéticos puede variar según la región o versión del portal.

### Fase 4: Evaluación de Equipo Rojo (Red Team)
- **Qué se explica:** Configuración de pruebas de seguridad automatizadas para simular ataques y detectar vulnerabilidades o desvíos de comportamiento.
- **Por qué es importante:** Identifica riesgos de seguridad y cumplimiento antes del despliegue, validando que el agente resista intentos de manipulación o uso malicioso.
- **Pasos concretos:**
  1. Crear evaluación `Red Team`.
  2. Revisar categorías de riesgo predefinidas: contenido inseguro, afirmaciones no verificadas, vulnerabilidades de código, adherencia a tareas (`Task Adherence`).
  3. Describir herramientas accesibles: `web_search` (búsqueda de SDKs) y `code_interpreter` (ejecución de código del agente).
  4. Guardar configuración.
  5. Ajustar `Seed queries` de 5 a 10 por categoría para mayor cobertura.
  6. Seleccionar estrategias de ataque: `AsciiSmuggler`, `Base64`, `Jailbreak`, `StringJoin`, `UnicodeSubstitution`, `IndirectJailbreak`.
  7. Revisar acciones prohibidas (ej. cambio de contraseña, exfiltración de datos).
  8. Enviar (`Submit`) para iniciar la simulación.
- **Errores, riesgos o dependencias:**
  - Seleccionar estrategias de ataque no contextuales genera falsos positivos y consume recursos innecesariamente.
  - La descripción precisa de las herramientas es obligatoria para que el simulador entienda el alcance real del agente.
  - *Pendiente de validar:* La lista exacta de estrategias de ataque disponibles puede expandirse o renombrarse en futuras actualizaciones de Foundry.

### Fase 5: Análisis de Resultados y Aplicación de Controles
- **Qué se explica:** Interpretación de reportes, uso de análisis asistido por IA y aplicación de controles nativos para corregir fallos detectados.
- **Por qué es importante:** Cierra el ciclo de mejora continua, transformando hallazgos en configuraciones operativas que garantizan el cumplimiento y la calidad antes de la producción.
- **Pasos concretos:**
  1. Abrir ejecución de evaluación automatizada → revisar reporte detallado por evaluador.
  2. Identificar fallo crítico: `Task Completion` al 59% (por debajo del umbral).
  3. Ejecutar análisis con IA → detectar patrones: `"Incomplete solutions"`, `"Action plan issues"`, `"Lack of executable outputs"`. La IA sugiere correcciones específicas.
  4. Abrir reporte `Red Team` → identificar `Task Adherence` en rojo.
  5. Ir al entorno de prueba del agente → sección `Controls` → `Manage Controls` → `Create`.
  6. Seleccionar riesgo `Task Adherence`. El control valida cada llamada a herramienta para asegurar que se alinea con la tarea asignada.
  7. Enviar (`Submit`) para activar el control.
  8. Re-ejecutar evaluaciones → métricas corregidas, cumplimiento general alcanzado → agente listo para producción.
- **Errores, riesgos o dependencias:**
  - Los controles no se activan automáticamente; requieren configuración explícita en la sección `Controls`.
  - La corrección de fallos exige re-ejecución de evaluaciones para validar el impacto real.
  - *Pendiente de validar:* La ruta exacta `Controls > Manage Controls > Create` puede variar ligeramente en interfaces futuras; se recomienda buscar la sección de "Agent Controls" o "Safety Controls" si no aparece con ese nombre.

---

## Procedimiento paso a paso

1. **Inicializar el agente:** Abrir `Visual Studio Code`, configurar `Foundry SDK`, definir herramientas (`WebSearch`, `CodeInterpreter`) y herramientas locales (FS, Git, debug, logs, búsqueda, scripts). Instanciar el agente y ejecutar prueba manual.
2. **Activar observabilidad:** Acceder al portal de `Microsoft Foundry` → pestaña `Traces` → revisar trazas `OTel` (respaldadas por `Azure Monitor`). Expandir sesiones para analizar inputs, lógica y salidas. Consultar pestaña `Monitoring` para costos, tokens, ejecuciones y tasas de error.
3. **Crear evaluación automatizada:** Ir a `Evaluations` → `Create` → `Automated`. Seleccionar agente/versión. Generar dataset sintético (90 filas, prompt contextual). Ajustar criterios (eliminar coherencia/fluidez/grounding; mantener seguridad). Enviar.
4. **Configurar Red Team:** Crear evaluación `Red Team`. Describir herramientas accesibles. Aumentar `Seed queries` a 10. Seleccionar estrategias de ataque relevantes (`Jailbreak`, `Base64`, etc.). Revisar acciones prohibidas. Enviar.
5. **Analizar y corregir:** Abrir reportes. Identificar fallos (`Task Completion` 59%, `Task Adherence` rojo). Ejecutar análisis con IA para obtener recomendaciones. Ir a `Controls` → `Manage Controls` → `Create` → activar `Task Adherence`. Validar con re-ejecución de evaluaciones.
6. **Validar y desplegar:** Confirmar que todas las métricas cumplen umbrales. El agente queda certificado para uso en producción o escalado controlado.

---

## Puntos críticos a recordar

- 🔹 **Ajuste contextual de criterios:** No todos los evaluadores de calidad aplican a todos los agentes. Eliminar los irrelevantes (coherencia, fluidez, grounding) evita ruido y enfoca la evaluación en métricas operativas reales.
- 🔹 **Controles no son automáticos:** Los controles de seguridad y cumplimiento (`Task Adherence`, etc.) deben activarse manualmente en la sección `Controls`. Sin esta configuración, el agente opera sin guardarrails nativos.
- 🔹 **Dependencia de observabilidad:** La integración con `OTel` y `Azure Monitor` es obligatoria para aprovechar las trazas estructuradas. Sin ella, la depuración se limita a logs planos y pierde eficiencia.
- 🔹 **Calidad del dataset sintético:** El prompt usado para generar datos de prueba determina la representatividad de la evaluación. Un prompt vago genera casos de prueba poco útiles.
- 🔹 **Estrategias de ataque contextuales:** En `Red Team`, seleccionar solo las técnicas de ataque relevantes al dominio del agente reduce falsos positivos y optimiza el tiempo de evaluación.
- 🔹 **Ciclo de validación iterativo:** Cada cambio de control o prompt requiere re-ejecución de evaluaciones. No asumir corrección sin métricas actualizadas.
- ⚠️ *Pendiente de validar:* Los nombres exactos de menús (`Controls`, `Evaluations`, `Traces`) y la disponibilidad de ciertas estrategias de ataque pueden variar según la versión del portal de Foundry y la suscripción de Azure. Se recomienda consultar la documentación oficial en `ai.azure.com` para actualizaciones de UI.

---

## Conclusión final

Microsoft Foundry consolida en una única plataforma el ciclo completo de desarrollo, evaluación y control de agentes de IA. El vídeo demuestra que la calidad de un agente no depende únicamente del modelo o el framework, sino de un flujo estructurado que combina observabilidad (`OTel`/`Azure Monitor`), evaluaciones automatizadas contextualizadas, pruebas de seguridad proactivas (`Red Team`) y la aplicación explícita de controles nativos. Al seguir este orden lógico, los equipos pueden detectar fallos de cumplimiento y seguridad temprano, aplicar correcciones basadas en análisis asistido por IA y validar objetivamente la readiness para producción. La clave operativa reside en ajustar criterios al contexto del agente, activar controles de forma explícita y mantener un ciclo iterativo de evaluación-revisión-despliegue. Para replicar este flujo, se recomienda iniciar con pruebas manuales, activar trazabilidad desde el día uno y utilizar los evaluadores y controles de Foundry como guardarrails automatizados antes de escalar a entornos críticos.