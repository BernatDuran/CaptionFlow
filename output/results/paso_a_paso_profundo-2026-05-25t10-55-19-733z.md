# Guía completa: Automatización de evaluaciones, controles de seguridad y mejora continua de agentes de IA con Microsoft Foundry

## Resumen ejecutivo

Este documento detalla el proceso completo de construcción, evaluación y endurecimiento de un agente de software (AI Agent) mediante la plataforma Microsoft Foundry (disponible en `ai.azure.com`). A partir de una demostración práctica, se explica cómo un agente genera automáticamente una aplicación de escritorio con Electron y React, y cómo el desarrollador utiliza el Foundry SDK en Visual Studio Code para dotarlo de herramientas. El núcleo del contenido se centra en el ciclo de evaluación automatizada: telemetría operativa con Azure Monitor, evaluaciones automáticas de calidad y seguridad, pruebas de Red Team con múltiples estrategias de ataque, análisis de resultados con IA y aplicación de controles de seguridad (safeguards) para garantizar la adherencia a la tarea. El objetivo es transformar un agente funcional en un sistema listo para producción, medible y conforme a políticas centrales.

---

## Fases del proceso

### Fase 1: Demostración del agente final y flujo de generación de aplicaciones

**Qué se explica:**
Se presenta el resultado final del agente de programación: un agente conversacional que recibe una solicitud en lenguaje natural y genera autónomamente una aplicación funcional. En el ejemplo, la solicitud es *"crear una aplicación de escritorio para Windows que gestione flujos de caja personales"*, con requisitos de velocidad, interfaz web (UI web), facilidad de uso, seguridad, privacidad y mantenibilidad del código. El agente produce un plan de ejecución, selecciona tecnologías (Electron y React), escribe el código en JavaScript/React, lo prueba, desarrolla funcionalidades adicionales tras confirmación del usuario y genera instrucciones de ejecución local.

**Por qué es importante:**
Establece el contexto del problema real: un agente de código no solo debe escribir sintaxis válida, sino entregar un producto funcional, seguro y desplegable. Sirve como línea base para identificar qué aspectos deben ser evaluados posteriormente (calidad del plan, completitud de la solución, seguridad).

**Pasos concretos mencionados:**
1. El usuario envía la solicitud en lenguaje natural.
2. El agente muestra la lógica de ejecución y el plan a la izquierda, y el código a la derecha.
3. El agente solicita confirmación para usar Electron y React.
4. Escribe, prueba y desarrolla la aplicación.
5. Solicita confirmación para añadir más características o enfocarse en seguridad; el usuario aprueba ambas.
6. Finaliza y define pasos para ejecución local.
7. El usuario abre una terminal PowerShell y ejecuta la aplicación.
8. Se valida funcionalmente: autenticación de usuario, entrada de datos (ej. "Gastos de viaje"), selección de categoría desplegable ("Transporte"), registro en base de datos local.

**Errores, riesgos o dependencias:**
- El proceso inicial toma varios minutos e incluye interacciones humanas (confirmaciones).
- Sin un ciclo de evaluación formal, el agente podría generar código incompleto o inseguro que no se detecta en la demostración final.
- La aplicación depende de una base de datos local, lo que implica que el entorno de ejecución debe tener las dependencias correctas instaladas.

---

### Fase 2: Arquitectura del agente y entorno de desarrollo (VS Code + Foundry SDK)

**Qué se explica:**
Se retrocede al estado inicial del desarrollo para mostrar la arquitectura interna del agente. El código reside en Visual Studio Code y utiliza el **Foundry SDK**. Se definen herramientas (tools) tanto remotas como locales.

**Por qué es importante:**
Permite entender que el comportamiento del agente no es magia, sino el resultado de una orquestación programática de herramientas y un SDK que se integra con el ecosistema de Foundry.

**Pasos concretos mencionados:**
1. **Herramientas definidas en el agente:**
   - `WebSearch`: para buscar información en internet.
   - `CodeInterpreter`: para ejecutar código.
2. **Herramientas locales disponibles en el entorno:**
   - Interacción con el sistema de archivos.
   - Git.
   - Depuración (Debug).
   - Registro (Logging).
   - Búsqueda local.
   - Ejecución de scripts.
3. **Línea principal del SDK:** en el centro del código se encuentra la invocación que crea el agente, añade las herramientas, define el nombre de despliegue y otros parámetros de configuración.
4. El agente ya está operativo y se ha iniciado el **testing manual** como primera capa de verificación.

**Errores, riesgos o dependencias:**
- El agente depende de que las herramientas locales (especialmente Git y sistema de archivos) estén correctamente configuradas en el entorno de ejecución.
- El testing manual es insuficiente para detectar fallos edge-case o vulnerabilidades de seguridad sistémicas.

---

### Fase 3: Observabilidad y telemetría en el portal de Microsoft Foundry

**Qué se explica:**
Se accede al portal web de Microsoft Foundry para monitorizar y depurar el agente mediante telemetría nativa. Se revisan dos pestañas clave: **Trazas (Traces)** y **Monitoreo (Monitoring)**.

**Por qué es importante:**
La observabilidad es el pilar sobre el que se construye la mejora. Sin visibilidad de las entradas, salidas, llamadas a herramientas y costos, es imposible priorizar qué evaluar o corregir.

**Pasos concretos mencionados:**
1. **Pestaña "Trazas" (Traces):**
   - Muestra trazas de **OpenTelemetry (OTel)** para todas las ejecuciones del agente.
   - La lista está ordenada por ejecuciones más recientes.
   - El backend es **Azure Monitor**.
   - Al hacer clic en una conversación o ID de traza, se despliega:
     - Entradas y salidas de la sesión.
     - Mensaje del sistema (system message).
     - Entradas del usuario.
     - Acciones del agente.
     - Lógica interna del agente.
     - Stack de tecnologías utilizado.
     - Características de la aplicación generada.
     - Proceso de desarrollo seguido.
     - Salidas de las herramientas invocadas.
   - Ventaja sobre logs estándar: facilita el análisis y acelera las revisiones.
2. **Pestaña "Monitoreo" (Monitoring):**
   - Ofrece una visión general consolidada de todas las actividades del agente.
   - Métricas clave mostradas:
     - **Costo estimado** acumulado.
     - **Uso de tokens** hasta la fecha.
     - Número total de ejecuciones del agente.
     - Conteo de ejecuciones exitosas vs. fallidas.
     - Consumo de tokens desglosado.
     - Llamadas a herramientas realizadas por el agente.
     - **Tasa de error** a lo largo del tiempo.

**Errores, riesgos o dependencias:**
- Si la ingesta de telemetría a Azure Monitor falla o tiene latencia, el diagnóstico en tiempo real se ve afectado.
- El costo estimado es una proyección; los precios finales dependen de la región y el modelo exacto (pendiente de validar si incluye costos de herramientas externas).

---

### Fase 4: Evaluación automática (AI-driven evaluation)

**Qué se explica:**
Se crea una evaluación automatizada para medir la calidad y seguridad del agente sin intervención humana directa en cada caso de prueba. El sistema utiliza IA para evaluar las respuestas del agente.

**Por qué es importante:**
Permite escalar el testing más allá de las pruebas manuales, estableciendo métricas objetivas y repetibles antes de pasar a producción.

**Pasos concretos mencionados:**
1. Acceder a la pestaña **"Evaluaciones"** y seleccionar **"Evaluación automática"**.
2. **Definir el objetivo:** el agente y la versión a evaluar ya vienen preseleccionados.
3. **Configurar los datos de prueba:**
   - Opción A: subir un dataset existente.
   - Opción B (seleccionada en el video): generar un **dataset sintético automáticamente**.
   - El usuario indica el propósito mediante una descripción textual: *"Crear un dataset para evaluar un agente de programación"*.
   - Se omite el archivo de referencia (skip reference file).
   - Se confirma la generación, produciendo **90 filas de datos** para testing.
4. **Seleccionar métricas de evaluación:**
   - **Evaluadores integrados para agentes** (built-in agent evaluators): múltiples disponibles.
   - **Calidad (Quality):** se muestran criterios editables. El usuario **elimina** explícitamente:
     - Coherencia (Coherence / التماسك).
     - Fluidez (Fluency / الطلاقة).
     - Fundamentación (Groundedness / الأساسية).
     - *Razón:* el agente de programación no los necesita.
   - **Seguridad (Safety):** se mantienen los **7 evaluadores de seguridad** por defecto.
5. **Revisar y enviar** la evaluación.
6. La evaluación se ejecuta en background y puede tardar varios minutos.

**Errores, riesgos o dependencias:**
- Los datasets sintéticos pueden no cubrir casos de uso reales extremos o específicos del dominio empresarial.
- Eliminar evaluadores de calidad reduce la cobertura; si el agente evoluciona a conversacional, estos criterios podrían volver a ser necesarios.
- El tiempo de ejecución depende de la carga de la plataforma y la complejidad del agente.

---

### Fase 5: Evaluación de Red Team (Pruebas de seguridad ofensivas)

**Qué se explica:**
Se configura una evaluación de **Equipo Rojo (Red Team)** para detectar vulnerabilidades de seguridad de forma automatizada. Este tipo de pruebas se presenta como una parte esencial del ciclo de desarrollo de IA.

**Por qué es importante:**
Los agentes de IA que ejecutan código y tienen acceso a herramientas externas son vectores de ataque críticos. El Red Team automatizado permite descubrir fallos de seguridad antes de que lo hagan actores maliciosos.

**Pasos concretos mencionados:**
1. Crear una nueva evaluación de Red Team.
2. **Configurar categorías de riesgo (Risk Categories):**
   - Se muestra una configuración estándar editable.
   - Categorías disponibles:
     - Contenido inseguro / dañino (Unsafe content).
     - Contenido no probado / sin fundamento (Ungrounded attributes).
     - Vulnerabilidades de código (Code vulnerabilities).
     - Cumplimiento / adherencia a la tarea (Task compliance / Task adherence).
   - El usuario puede modificar estas categorías según el contexto del agente.
3. **Describir las herramientas accesibles por el agente:**
   - `web_search`: *"Buscar en internet SDKs relevantes"*.
   - `code_interpreter`: *"Ejecutar código para el agente de programación"*.
   - Esto permite que el Red Team diseñe ataques contextualizados.
   - Guardar la configuración.
4. **Ajustar consultas semilla (Seed Queries):**
   - Se cambia de 5 a **10 consultas por categoría** para ampliar la cobertura de prueba.
5. **Seleccionar estrategias de ataque (Attack Strategies):**
   - Se visualizan las tácticas que los agentes atacantes simularán.
   - Se seleccionan explícitamente:
     - `AsciiSmuggler`
     - `Base64`
     - `Jailbreak`
     - `StringJoin`
     - `UnicodeSubstitution`
     - `IndirectJailbreak`
   - Cada mosaico/caja describe el tipo de ataque a probar.
6. **Revisar acciones prohibidas (Prohibited Actions / Blocked Actions):**
   - Lista de comportamientos que el agente nunca debe realizar, como:
     - Intentos de cambio de contraseña.
     - Otras acciones sensibles (pendiente de validar el listado completo).
   - Estas pruebas se automatizan en nombre del desarrollador.
7. Enviar la evaluación de Red Team.

**Errores, riesgos o dependencias:**
- Aumentar las seed queries y las estrategias de ataque incrementa el tiempo y el costo de la evaluación.
- Si la descripción de las herramientas es imprecisa, el Red Team podría generar ataques irrelevantes o omitir vectores reales.
- Algunas estrategias como `IndirectJailbreak` pueden requerir modelos o configuraciones específicas para ser efectivas (pendiente de validar compatibilidad con todos los modelos de Foundry).

---

### Fase 6: Análisis de resultados e implementación de controles (Safeguards)

**Qué se explica:**
Se revisan los resultados de ambas evaluaciones (automática y Red Team), se identifican las métricas fallidas y se aplican **controles (Safeguards / Guardrails)** directamente en el agente para mitigar los riesgos detectados.

**Por qué es importante:**
Cerrar el ciclo de mejora continua: de la medición al remedio. Sin esta fase, las evaluaciones solo son diagnósticos sin acción.

**Pasos concretos mencionados:**
1. **Revisar resultados de la evaluación automática:**
   - Se observa un panel de ejecuciones.
   - Abrir el informe de la evaluación automática.
   - Se muestra el detalle por evaluador.
   - **Hallazgo crítico:** la métrica de **Task Completion (Finalización de tareas / إنجاز المهام)** está en **59 %**, por debajo del umbral aceptable.
   - Se inicia el **análisis con IA** integrado en la plataforma.
   - El análisis agregado identifica:
     - "Soluciones incompletas".
     - "Problemas en el plan de trabajo".
     - Al auditar: "Falta de salidas ejecutables" (falta de outputs ejecutables / código funcional completo).
     - La IA sugiere métodos específicos para corregirlo.
2. **Revisar resultados del Red Team:**
   - En la vista principal, se identifica que **Task Adherence (Adherencia a la tarea / الالتزام بالمهام)** aparece en **rojo**.
   - Esto se correlaciona con el bajo Task Completion detectado anteriormente.
3. **Aplicar controles de mitigación:**
   - Ir al entorno de pruebas del agente.
   - Desplazarse a la sección **"Controles" (Safeguards / الضوابط)**.
   - Inicialmente solo están activos los controles por defecto.
   - Hacer clic en **"Gestionar controles"** y luego **"Crear"**.
   - Seleccionar el tipo de riesgo a detectar y mitigar.
   - Elegir **"Task Adherence" (Adherencia a la tarea / الالتزام بالمهمة)**.
   - Este control verifica cada llamada a herramienta que realiza el agente para confirmar que se usa correctamente y de forma alineada con la tarea asignada.
   - Enviar para activar el control.
4. **Re-evaluar:**
   - Tras aplicar el control, se ejecuta una nueva evaluación.
   - Resultado: **Task Completion ahora está completo (100 % o nivel aceptable)**.
   - Todos los objetivos de calidad generales se cumplen.

**Errores, riesgos o dependencias:**
- El control de Task Adherence puede introducir latencia adicional en cada llamada a herramienta.
- Si el control es demasiado estricto, podría bloquear llamadas legítimas que son necesarias para completar tareas complejas (falso positivo).
- La correlación exacta entre "Task Adherence" (métrica de seguridad del Red Team) y "Task Completion" (métrica de calidad de la evaluación automática) depende de la implementación interna de los evaluadores de Foundry (pendiente de validar si son la misma métrica con nombres traducidos diferente o métricas distintas pero correlacionadas).

---

### Fase 7: Visión integral y gobernanza centralizada

**Qué se explica:**
Se cierra la demostración enfatizando que Foundry no solo opera a nivel de un agente individual, sino que proporciona capacidades de gobernanza a escala.

**Por qué es importante:**
En entornos empresariales reales, no se despliega un único agente, sino docenas o cientos. La gestión centralizada de políticas, costos y conformidad es indispensable.

**Pasos concretos mencionados:**
- Foundry ofrece una **visión unificada del rendimiento** de todos los agentes desplegados.
- Permite aplicar **políticas y configuraciones centrales** para garantizar el cumplimiento (compliance) de todos los agentes de la organización.

**Errores, riesgos o dependencias:**
- La gobernanza centralizada requiere permisos de administrador y una estrategia previa de RBAC (control de acceso basado en roles) que no se detalla en el video.

---

## Procedimiento paso a paso

A continuación, se resume el flujo operativo completo para replicar el proceso mostrado en el video:

1. **Desarrollar el agente localmente**
   - Abrir Visual Studio Code.
   - Integrar el **Foundry SDK**.
   - Definir las herramientas del agente: `WebSearch`, `CodeInterpreter`, y herramientas locales (sistema de archivos, Git, depuración, registro, búsqueda local, ejecución de scripts).
   - Implementar la línea de creación del agente con su nombre de despliegue y herramientas.
   - Realizar pruebas manuales iniciales.

2. **Observar y depurar en el portal de Microsoft Foundry**
   - Acceder a `ai.azure.com`.
   - Abrir el agente y navegar a la pestaña **Trazas (Traces)**.
   - Revisar trazas OTel respaldadas por Azure Monitor; hacer clic en IDs de traza para ver entradas, salidas, mensajes del sistema, lógica del agente y salidas de herramientas.
   - Navegar a la pestaña **Monitoreo (Monitoring)** para revisar costo estimado, uso de tokens, ejecuciones totales, éxitos, fallos, llamadas a herramientas y tasa de error.

3. **Crear y ejecutar la evaluación automática**
   - Ir a la pestaña **Evaluaciones**.
   - Seleccionar **Evaluación automática** > **Crear**.
   - Verificar que el agente y la versión objetivo sean correctos.
   - Generar un **dataset sintético** describiendo el propósito (ej. *"Crear dataset para evaluar agente de programación"*), omitir archivo de referencia y confirmar (ej. 90 filas).
   - Seleccionar métricas: mantener evaluadores de agentes y seguridad; en calidad, eliminar los no necesarios (coherencia, fluidez, fundamentación).
   - Revisar y enviar. Esperar a que finalice.

4. **Crear y ejecutar la evaluación de Red Team**
   - En la pestaña **Evaluaciones**, crear una evaluación de **Equipo Rojo (Red Team)**.
   - Configurar categorías de riesgo (inseguro, no probado, vulnerabilidades de código, adherencia a tareas).
   - Describir las herramientas del agente (`web_search`, `code_interpreter`) para contextualizar los ataques.
   - Aumentar las **consultas semilla** a 10 por categoría.
   - Seleccionar estrategias de ataque: `AsciiSmuggler`, `Base64`, `Jailbreak`, `StringJoin`, `UnicodeSubstitution`, `IndirectJailbreak`.
   - Revisar la lista de acciones prohibidas (ej. cambio de contraseña).
   - Enviar y esperar resultados.

5. **Analizar resultados y diagnosticar fallos**
   - Abrir el informe de la evaluación automática.
   - Identificar métricas bajas (ej. Task Completion al 59 %).
   - Usar el **análisis con IA** integrado para obtener un resumen agregado de problemas (soluciones incompletas, problemas de plan, falta de salidas ejecutables) y sugerencias de mejora.
   - Abrir el informe del Red Team y verificar métricas en rojo (ej. Task Adherence).

6. **Implementar controles de seguridad (Safeguards)**
   - Ir al entorno de pruebas del agente.
   - Acceder a la sección **Controles**.
   - Clic en **Gestionar controles** > **Crear**.
   - Seleccionar el riesgo: **Task Adherence (Adherencia a la tarea)**.
   - Este control auditará cada llamada a herramienta para verificar su alineación con la tarea.
   - Enviar y activar.

7. **Validar la corrección**
   - Ejecutar una nueva evaluación automática.
   - Verificar que **Task Completion** ahora alcanza el nivel completo/aceptable.
   - Confirmar que todos los objetivos de calidad y seguridad se cumplen.
   - El agente está listo para uso más amplio o producción.

---

## Puntos críticos a recordar

- **El ciclo de vida no termina en el código funcional:** la demostración inicial del agente generando una app en minutos es solo la superficie. El trabajo de evaluación, seguridad y control es lo que lo hace preparado para producción.
- **Usa el Foundry SDK para definir herramientas explícitas:** el agente debe declarar qué puede hacer (`WebSearch`, `CodeInterpreter`, herramientas locales). Esto no solo define su capacidad, sino que también alimenta las evaluaciones de Red Team.
- **La telemetría OTel en "Trazas" es diferente a los logs tradicionales:** proporciona una visión estructurada de todo el flujo de ejecución (system messages, entradas de usuario, lógica interna, salidas de herramientas), lo que acelera la depuración.
- **Los datasets sintéticos ahorran tiempo, pero valídalos:** generar 90 filas automáticamente es eficiente, pero debes asegurarte de que representen escenarios reales de tus usuarios.
- **Sé selectivo con los evaluadores de calidad:** no todos los criterios conversacionales (coherencia, fluidez) aplican a agentes de código. Adapta las métricas al dominio para evitar ruido.
- **El Red Team es una parte esencial, no opcional:** las pruebas de seguridad ofensiva con múltiples estrategias (`Jailbreak`, `IndirectJailbreak`, `AsciiSmuggler`, etc.) deben ejecutarse para cualquier agente con capacidad de ejecución de código o acceso a información externa.
- **Task Completion y Task Adherence están relacionados pero se miden diferente:** la evaluación automática mide si la tarea se completó (calidad); el Red Team mide si el agente se adhiere a la tarea y no divaga o es manipulado (seguridad). Ambos fallaron inicialmente y ambos se resolvieron con el mismo control de **Task Adherence**.
- **Los controles (Safeguards) actúan en tiempo de ejecución:** una vez activados, interceptan y validan las llamadas a herramientas del agente, mitigando riesgos detectados en las evaluaciones.
- **Foundry escala a gobernanza empresarial:** más allá del agente individual, la plataforma permite visibilidad centralizada, políticas globales y control de costos para todos los agentes de la organización.

---

## Conclusión

La construcción de agentes de IA confiables y seguros requiere mucho más que un modelo de lenguaje potente y un SDK funcional. Como se demuestra en el flujo de Microsoft Foundry, el paso a producción exige un ciclo riguroso de **observabilidad, evaluación automatizada, pruebas de seguridad ofensivas (Red Team) y aplicación de controles**. El video ilustra cómo un agente de programación que inicialmente generaba soluciones incompletas (59 % de finalización de tareas) y presentaba fallos de adherencia a la tarea en pruebas de seguridad, pudo ser endurecido hasta alcanzar métricas completas mediante la activación de un control específico de **Task Adherence** que audita cada llamada a herramienta. Las herramientas integradas en Foundry —telemetría OTel, generación sintética de datasets, evaluadores de calidad y seguridad, análisis de resultados con IA y guardrails configurables— permiten a los desarrolladores pasar de prototipos impresionantes pero frágiles a agentes empresariales medibles, seguros y gobernados centralmente. Para comenzar a aplicar este proceso, el punto de entrada es el portal de **Microsoft Foundry en `ai.azure.com`**.