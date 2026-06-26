# Guía Técnica: Google Antigravity 2.0 - Automatización y Agentes de IA

## Resumen Ejecutivo
Google Antigravity 2.0 representa una evolución significativa en la automatización de tareas complejas mediante agentes de IA. Esta versión permite la creación de proyectos fully funcionales, análisis de datos locales y automatización del navegador, todo accesible desde planes gratuitos. Destaca por su modelo **Gemini 3.5 Flash**, que ofrece velocidad superior y capacidades agénticas paralelas. La herramienta se integra en el sistema operativo (Mac, Windows, Linux) y permite gestionar carpetas locales, programar tareas recurrentes y utilizar atajos de comando para flujos de trabajo autónomos o guiados.

---

## 1. Fases Lógicas de Implementación

### Fase 1: Instalación y Configuración Inicial
*   **Qué se explica:** Proceso de descarga, instalación y primer acceso a la plataforma Antigravity 2.0.
*   **Por qué es importante:** Establece el entorno de trabajo y define los permisos base necesarios para que los agentes operen correctamente.
*   **Pasos concretos:**
    1.  Descargar la versión **Antigravity 2.0** desde la plataforma oficial (disponible para Mac, Windows, Linux).
    2.  Instalar la aplicación.
    3.  Iniciar sesión (ej. con cuenta de Google).
    4.  Seleccionar el tema visual (ej. Modo Oscuro).
    5.  Elegir capacidades preinstaladas (ej. desarrollo Android, creación web) o dejar instalación limpia.
*   **Errories/Riesgos/Dependencias:**
    *   **Riesgo:** Instalar capacidades no utilizadas puede saturar el entorno inicial. Se recomienda instalación limpia.
    *   **Dependencia:** Requiere conexión a internet para login y descarga de modelos.
    *   **Nota:** Existe una versión anterior llamada **Antigravity ID** (interfaz técnica) y versiones CLI/SDK, pero esta guía se centra en la versión 2.0 GUI.

### Fase 2: Selección de Modelos y Capacidades Agénticas
*   **Qué se explica:** Configuración del modelo de IA y comprensión de las nuevas capacidades de velocidad y paralelismo.
*   **Por qué es importante:** El modelo elegido determina la velocidad de tokenización y la capacidad de ejecutar subtareas en paralelo.
*   **Pasos concretos:**
    1.  En la interfaz principal, seleccionar el modelo a utilizar.
    2.  Elegir **Gemini 3.5 Flash** (destacado como el mejor modelo actual en velocidad y capacidades agénticas).
    3.  Habilitar el método de transcripción (para ver lo que se dice en tiempo real).
*   **Errores/Riesgos/Dependencias:**
    *   **Límites:** Existen límites de uso cada 5 horas.
    *   **Ventaja:** Los límites son independientes por modelo (si se agota Gemini 3.5 Flash, se puede cambiar a Opus).
    *   **Ambigüedad:** El video menciona "Gemini 3.5 Flash" y compara con "Clot Opus 4.7" o "GPT 5.5" (nombres específicos del contexto del video).

### Fase 3: Creación de Proyectos y Análisis de Datos (Caso Petabi)
*   **Qué se explica:** Uso de agentes para analizar archivos locales (CSV) y generar dashboards interactivos.
*   **Por qué es importante:** Demuestra la capacidad de la IA para acceder al sistema de archivos local, cruzar datos desorganizados y generar software funcional.
*   **Pasos concretos:**
    1.  Abrir la barra lateral y clicar en **"Create a new project"** (Crear nuevo proyecto).
    2.  Seleccionar una carpeta local (ej. Carpeta `Downloads`).
    3.  Proporcionar contexto vía voz/texto: Explicar que hay archivos CSV desorganizados (ventas, inventario, competidores).
    4.  Solicitar cruzar información y crear una aplicación interactiva con filtros y categorías.
    5.  Revisar el **Plan de Implementación** generado (aprox. 8 segundos) y clicar **"Proceed"**.
    6.  Esperar la generación de archivos (HTML, etc.) y abrir el resultado.
*   **Errores/Riesgos/Dependencias:**
    *   **Permisos:** Los agentes requieren acceso explícito a la carpeta seleccionada.
    *   **Calidad de datos:** El resultado depende de la información contenida en los CSV locales.
    *   **Validación:** El usuario debe verificar que los archivos generados (HTML) se abren correctamente en el navegador.

### Fase 4: Desarrollo de Aplicaciones Complejas y Gamificación (Caso Duobi)
*   **Qué se explica:** Creación iterativa de una aplicación tipo Duolingo ("Duobi") con mascota, gamificación y múltiples lecciones.
*   **Por qué es importante:** Muestra la capacidad de generar lógica de negocio, assets visuales (emociones de la mascota) y flujos de usuario completos en un solo intento.
*   **Pasos concretos:**
    1.  Iniciar nueva conversación en Antigravity.
    2.  Solicitar app educativa gamificada (estilo Duolingo) con mascota (rana llamada Duobi).
    3.  Aprobar el plan de implementación.
    4.  Probar la aplicación: Iniciar lección, responder preguntas, verificar feedback visual (mascota triste/feliz).
    5.  Solicitar mejoras iterativas: Modo noche, tienda de disfraces, investigación de funciones virales.
    6.  Observar la ejecución de **sub-agentes** en paralelo (investigación, desarrollo, programación).
*   **Errores/Riesgos/Dependencias:**
    *   **Complejidad:** A mayor complejidad solicitada, mayor tiempo de procesamiento (aunque se menciona "tiempo récord").
    *   **Persistencia:** El progreso se guarda entre iteraciones si se mantiene el contexto del proyecto.

### Fase 5: Atajos (Shortcuts) y Automatización del Navegador
*   **Qué se explica:** Uso de comandos especiales (`/`) para controlar el comportamiento del agente (Navegador, Modo Objetivo, Modo Interrogatorio).
*   **Por qué es importante:** Permite controlar el grado de autonomía del agente y extender sus capacidades al navegador web.
*   **Pasos concretos:**
    1.  Escribir `/` en el chat para ver herramientas MCP y skills.
    2.  **Browser:** Seleccionar `/browser`. Instruir al agente para que juegue la app creada en Chrome.
        *   *Requisito:* Abrir Chrome, pegar URL, habilitar opción de control automático.
    3.  **Goal:** Seleccionar `/goal`. Instruir crear mini-app sin preguntar (autonomía 100%).
    4.  **Grill Me:** Seleccionar `/grill_me`. El agente hará preguntas para personalizar el resultado antes de crear nada.
*   **Errores/Riesgos/Dependencias:**
    *   **Control Humano:** En modo `/goal`, el agente actúa sin aprobación intermedia.
    *   **Seguridad:** Permitir control del navegador (`automated software is controlling my Google Chrome`) requiere confirmación explícita del usuario.
    *   **Interrupción:** Se puede detener procesos en ejecución desde la vista ampliada del chat.

### Fase 6: Programación de Tareas y Ecosistema (CLI/SDK)
*   **Qué se explica:** Automatización temporal de agentes y uso de herramientas para desarrolladores.
*   **Por qué es importante:** Convierte a la IA en un trabajador asíncrono que opera sin supervisión constante.
*   **Pasos concretos:**
    1.  Acceder a configuración y buscar opción **"Scare tags"** (transcrito, contexto implica *Scheduled Tasks*).
    2.  Clic en **"New"**.
    3.  Configurar tarea: Ej. "Duobi improver", hora (9:00 AM), instrucción (investigar features diarias).
    4.  Guardar tarea (se ejecuta automáticamente).
    5.  **Opcional:** Instalar **Antigravity CLI** vía terminal para acceso por comandos.
    6.  **Opcional:** Descargar **Antigravity ID** para ver cambios de código técnicos.
*   **Errores/Riesgos/Dependencias:**
    *   **Ambigüedad:** La transcripción menciona "scare tags", lo cual parece un error de ASR por "Scheduled Tasks" o similar. Se debe validar en la interfaz real.
    *   **Recursos:** Mantener el ordenador encendido (configurable en settings para no suspender) es necesario para tareas programadas locales.

---

## 2. Procedimiento Paso a Paso (Flujo Principal)

Para replicar el uso básico de Antigravity 2.0 según el video:

1.  **Descarga e Instalación:**
    *   Visite la página de descarga de Antigravity.
    *   Descargue la versión **2.0** para su SO.
    *   Instale y abra la aplicación.
2.  **Autenticación y Configuración:**
    *   Inicie sesión con su cuenta.
    *   Seleccione **Modo Oscuro** (opcional).
    *   Omita la instalación de herramientas extra para un inicio limpio.
3.  **Creación del Entorno:**
    *   Clique en el icono **"Create a new project"**.
    *   Seleccione una carpeta local (ej. `Downloads`) para dar acceso a los agentes.
4.  **Selección del Modelo:**
    *   En la barra de modelo, elija **Gemini 3.5 Flash**.
    *   Active la transcripción en tiempo real si desea usar voz.
5.  **Ejecución de Tarea:**
    *   Describa el objetivo (ej. "Analizar CSVs y crear dashboard").
    *   Revise el **Plan de Implementación** generado.
    *   Clique **"Proceed"** para iniciar la ejecución.
6.  **Uso de Atajos (Opcional):**
    *   Escriba `/` para acceder a modos como `/browser` (control web) o `/goal` (autonomía total).
7.  **Automatización (Opcional):**
    *   Vaya a configuración de tareas programadas.
    *   Cree una nueva tarea recurrente (ej. diaria a las 9:00 AM).

---

## 3. Puntos Críticos a Recordar

*   **Límites de Uso:** Existen límites de consumo cada 5 horas, pero son **independientes por modelo**. Si se agota uno, cambie a otro (ej. de Flash a Opus) para continuar.
*   **Permisos de Carpeta:** Los agentes solo tienen acceso a las carpetas explícitamente seleccionadas al crear el proyecto. Se pueden añadir más rutas en la configuración del proyecto.
*   **Modos de Autonomía:**
    *   `/goal`: El agente no pregunta, ejecuta directamente.
    *   `/grill_me`: El agente pregunta todo antes de ejecutar.
    *   Default: Genera plan y espera aprobación ("Proceed").
*   **Variantes del Producto:** Antigravity 2.0 no reemplaza a la versión anterior (**Antigravity ID**), que es útil para usuarios técnicos que quieren ver el código. También existen **SDK** y **CLI**.
*   **Configuración de Energía:** En ajustes generales, puede activar la opción para **evitar que el ordenador se suspenda**, crucial para tareas largas o programadas.
*   **Ambigüedad de Interfaz:** La opción de tareas programadas aparece transcrita como **"scare tags"**. Se recomienda buscar en el menú una opción relacionada con "Schedule" o "Tasks" si la etiqueta exacta no coincide.

---

## 4. Conclusión

Google Antigravity 2.0 se posiciona como una plataforma de desarrollo y automatización impulsada por agentes, diferenciándose por la velocidad del modelo **Gemini 3.5 Flash** y su capacidad para ejecutar subtareas en paralelo. La herramienta democratiza el acceso a capacidades avanzadas (disponibles en versión gratuita) permitiendo desde la creación de dashboards de negocio hasta la automatización del navegador y tareas programadas.

La clave de su utilidad reside en la configuración correcta de los permisos locales y la selección del modo de autonomía adecuado (`/goal` vs `/grill_me`) según la necesidad de control del usuario. Aunque presenta algunas ambigüedades en la nomenclatura de ciertas funciones (ej. tareas programadas), su ecosistema complementario (CLI, SDK, ID) asegura cobertura tanto para usuarios finales como para desarrolladores técnicos.

> **Nota Final:** El video sugiere que esta herramienta compite directamente con plataformas como "Cloud Cowork" y "Codex", enfatizando la simplicidad y el poder de la orquestación automática de agentes.