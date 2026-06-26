# Automatización de Evaluaciones y Seguridad de Agentes con Microsoft Foundry

## Resumen Ejecutivo
Esta guía detalla el ciclo de vida completo para desarrollar, evaluar y asegurar un agente de IA utilizando la plataforma Microsoft Foundry. El proceso abarca desde la creación inicial del agente con SDK hasta su despliegue, pasando por la monitorización de trazas, la ejecución de evaluaciones automatizadas y de "Equipo Rojo" (Red Team), y la implementación de controles de seguridad (Guardrails). El objetivo es transformar un prototipo funcional en una solución de producción fiable, optimizando métricas de calidad, seguridad y cumplimiento de tareas mediante herramientas integradas en Azure.

---

## Fases del Proceso de Desarrollo y Evaluación

### Fase 1: Construcción y Demostración del Agente
*   **Qué se explica:** Se presenta el resultado final de un agente capaz de generar aplicaciones de escritorio (Windows) basadas en prompts de usuario, utilizando React y Electron.
*   **Por qué es importante:** Establece la línea base de funcionalidad. Muestra la capacidad del agente para planificar, codificar, probar y dar instrucciones de despliegue local.
*   **Pasos concretos:**
    1.  El usuario envía un prompt para crear una app de gestión de flujo de caja.
    2.  El agente muestra la lógica de ejecución y el código (React/JavaScript).
    3.  El usuario confirma el uso de Electron y la inclusión de seguridad/funciones.
    4.  El agente finaliza el código y proporciona pasos para ejecutarlo en PowerShell.
*   **Errores/Riesgos/Dependencias:**
    *   **Riesgo:** El código generado puede no ser seguro o eficiente sin supervisión.
    *   **Dependencia:** Requiere entorno local (PowerShell) para validar la ejecución final.

### Fase 2: Desarrollo y Trazabilidad (VS Code y Portal Foundry)
*   **Qué se explica:** Se revela el "detrás de escena" en Visual Studio Code y la portal de Microsoft Foundry para observar el comportamiento interno.
*   **Por qué es importante:** Permite depurar y entender *cómo* el agente toma decisiones, no solo el resultado final. Facilita la auditoría.
*   **Pasos concretos:**
    1.  **VS Code:** Uso de **Foundry SDK**. Configuración de herramientas (`WebSearch`, `CodeInterpreter`) y herramientas locales (sistema de archivos, Git).
    2.  **Portal Foundry (Pestaña Trazas):** Visualización de trazas **OTel** respaldadas por **Azure Monitor**.
    3.  **Análisis:** Clic en identificadores de traza para ver entradas, salidas, lógica del agente y herramientas invocadas.
*   **Errores/Riesgos/Dependencias:**
    *   **Dependencia:** Integración necesaria con Azure Monitor para el almacenamiento de trazas.
    *   **Riesgo:** Sin trazas detalladas, es difícil diagnosticar fallos en la lógica del agente.

### Fase 3: Monitorización Operativa
*   **Qué se explica:** Revisión de métricas de rendimiento y costo antes de configurar evaluaciones profundas.
*   **Por qué es importante:** Proporciona una visión general de la salud del agente (costos, tasas de éxito) para detectar anomalías operativas.
*   **Pasos concretos:**
    1.  Navegar a la pestaña **"Monitoring" (Monitorización)**.
    2.  Revisar: Costo estimado, uso de tokens, ejecuciones totales, éxitos/fallos, llamadas a herramientas y tasa de error.
*   **Errores/Riesgos/Dependencias:**
    *   **Riesgo:** Un agente nuevo puede no tener datos suficientes para métricas significativas inicialmente.
    *   **Atención:** Las evaluaciones automáticas aún no están configuradas en esta etapa.

### Fase 4: Configuración de Evaluaciones (Automatizada y Equipo Rojo)
*   **Qué se explica:** Implementación de pruebas sistemáticas para medir calidad y seguridad.
*   **Por qué es importante:** Automatiza la detección de fallos que las pruebas manuales podrían pasar por alto, especialmente en seguridad y cumplimiento de tareas.
*   **Pasos concretos:**
    1.  **Evaluación Automatizada:**
        *   Ir a pestaña **"Evaluations"**. Clic en **"Create"**.
        *   **Datos:** Generar conjunto de datos sintéticos (ej. 90 filas) mediante prompt ("Crear conjunto de datos para evaluar agente...").
        *   **Métricas:** Seleccionar evaluadores de calidad (se eliminaron coherencia/fluidez) y seguridad (7 evaluadores mantenidos).
    2.  **Equipo Rojo (Red Team):**
        *   Configurar categorías de riesgo (inseguro, no fundamentado, vulnerabilidades de código, cumplimiento de tareas).
        *   Definir herramientas (`web_search`, `code_interpreter`).
        *   Aumentar consultas *Seed* de 5 a 10 por categoría.
        *   Seleccionar estrategias de ataque: `AsciiSmuggler`, `Base64`, `Jailbreak`, `StringJoin`, `UnicodeSubstitution`, `IndirectJailbreak`.
        *   Definir acciones prohibidas (ej. cambiar contraseñas).
*   **Errores/Riesgos/Dependencias:**
    *   **Riesgo:** Las evaluaciones pueden tardar varios minutos en completarse.
    *   **Dependencia:** Necesidad de definir claramente qué herramientas puede usar el agente para que el Equipo Rojo las teste correctamente.

### Fase 5: Análisis de Resultados y Remediación con Controles
*   **Qué se explica:** Interpretación de los informes de evaluación y aplicación de "Guardrails" (Controles) para corregir deficiencias.
*   **Por qué es importante:** Cierra el ciclo de mejora continua. Transforma los datos de fallo en configuraciones de seguridad activas.
*   **Pasos concretos:**
    1.  **Análisis Automatizado:** Usar IA para analizar resultados. Se detectó **59% de finalización de tareas** (bajo). Problemas: "Soluciones incompletas", "Falta de salidas accionables".
    2.  **Análisis Equipo Rojo:** Se marcó "Cumplimiento de tareas" en rojo.
    3.  **Remediación:**
        *   Ir a entorno de prueba del agente -> **"Guardrails" (Controles)**.
        *   Clic en **"Manage Guardrails"** -> **"Create"**.
        *   Seleccionar Riesgo: **"Task Compliance" (Cumplimiento de tareas)**.
        *   Activar el control para verificar llamadas a herramientas.
    4.  **Validación:** Re-ejecutar evaluación. El cumplimiento de tareas se corrige y se alcanzan los objetivos de calidad.
*   **Errores/Riesgos/Dependencias:**
    *   **Riesgo:** Activar controles demasiado estrictos podría limitar la funcionalidad legítima del agente.
    *   **Dependencia:** La corrección depende de la existencia de un control nativo para el riesgo identificado (en este caso, Cumplimiento de tareas).

---

## Procedimiento Paso a Paso

Para replicar el flujo de trabajo de evaluación y aseguramiento descrito:

1.  **Desarrollo Inicial:**
    *   Configure su agente en **Visual Studio Code** usando **Foundry SDK**.
    *   Defina las herramientas permitidas (ej. `WebSearch`, `CodeInterpreter`).
    *   Realice pruebas manuales iniciales.
2.  **Revisión de Trazas:**
    *   Acceda al **Portal de Microsoft Foundry**.
    *   Navegue a la pestaña **"Traces" (Trazas)**.
    *   Seleccione una sesión específica para auditar entradas, salidas y lógica de decisión.
3.  **Configuración de Evaluación Automatizada:**
    *   En la pestaña **"Evaluations"**, cree una nueva evaluación.
    *   Genere datos sintéticos (ej. 90 filas) si no posee un dataset propio.
    *   Seleccione métricas de seguridad y calidad relevantes (elimine las innecesarias).
4.  **Configuración de Equipo Rojo (Red Team):**
    *   Cree una evaluación de Equipo Rojo.
    *   Defina las categorías de riesgo y las herramientas accesibles.
    *   Aumente las consultas *Seed* (ej. a 10 por categoría).
    *   Seleccione estrategias de ataque específicas (`Jailbreak`, `Base64`, etc.).
5.  **Análisis y Corrección:**
    *   Revise los informes de resultados. Identifique métricas bajas (ej. <60% en finalización de tareas).
    *   Utilice la función de **Análisis con IA** para obtener recomendaciones de mejora.
    *   Si se detectan fallos de seguridad o cumplimiento, vaya a **"Guardrails"**.
    *   Cree y active un control específico para el riesgo detectado (ej. "Task Compliance").
6.  **Validación Final:**
    *   Vuelva a ejecutar las evaluaciones para confirmar que los controles han resuelto las vulnerabilidades sin romper la funcionalidad.

---

## Puntos Críticos a Recordar

*   **Datos Sintéticos:** Microsoft Foundry permite generar datasets de prueba sintéticos automáticamente, lo que ahorra tiempo significativo en la fase de configuración de evaluaciones.
*   **Métrica de Éxito:** En el caso analizado, una tasa de **finalización de tareas del 59%** se consideró insuficiente y requirió intervención. Establezca umbrales claros para su propio contexto.
*   **Análisis asistido por IA:** No revise los resultados manualmente uno por uno; utilice la herramienta de análisis agregado de Foundry para identificar patrones de fallo (ej. "Salidas no accionables").
*   **Controles Específicos:** La solución a los fallos de cumplimiento no fue reentrenar el modelo, sino activar un **Control (Guardrail)** específico de "Cumplimiento de tareas" que verifica las llamadas a herramientas.
*   **Seguridad Proactiva:** El Equipo Rojo no es opcional; debe configurarse con estrategias de ataque concretas (como `AsciiSmuggler` o `IndirectJailbreak`) para simular adversarios reales.
*   **Integración Azure:** Toda la telemetría y trazas están respaldadas por **Azure Monitor**, lo que garantiza escalabilidad y estándares de industria (OTel).

---

## Conclusión

La implementación de un agente de IA en producción no finaliza con la escritura del código. Como se demuestra en este flujo de trabajo de **Microsoft Foundry**, la calidad y seguridad dependen de un ciclo riguroso de **observabilidad (Trazas)**, **evaluación automatizada** y **controles activos (Guardrails)**.

La capacidad de generar datos de prueba sintéticos y utilizar análisis impulsados por IA para diagnosticar fallos reduce drásticamente el tiempo de puesta a punto. Sin embargo, el punto clave es la capacidad de reacción: detectar una métrica baja (como el 59% en cumplimiento) y aplicar un control configurado específicamente para mitigar ese riesgo. Para escalar esto a nivel empresarial, Foundry permite aplicar estas políticas de forma centralizada a través de todos los agentes, asegurando un estándar uniforme de seguridad y rendimiento.

> **Nota:** Para comenzar a utilizar estas herramientas, visite [ai.azure.com](https://ai.azure.com).