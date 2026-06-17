# Resumen Ejecutivo: Proyecto CaptionFlow (Analizador de YouTube)

## 1. Objetivo del Proyecto
El objetivo principal de esta plataforma es **automatizar y acelerar la extracción de conocimiento de vídeos de YouTube**. A través de una interfaz web sencilla, permite a cualquier usuario transformar horas de contenido audiovisual en resúmenes estructurados, análisis detallados y diagramas visuales en cuestión de segundos, reduciendo drásticamente el tiempo de análisis manual.

## 2. Arquitectura y Stack Tecnológico (A groso modo)
El proyecto cuenta con una arquitectura modular que separa claramente la extracción de datos, la interfaz de usuario y el procesamiento lógico:

*   **Frontend (Interfaz de Usuario):** Desarrollado con tecnologías web modernas (React y Vite). Garantiza una experiencia de usuario rápida, reactiva y orientada a la visualización clara de datos.
*   **Backend (Orquestador):** Un servidor basado en Node.js (Express) que gestiona la seguridad, las reglas de negocio y orquesta la comunicación entre los distintos componentes.
*   **Motor de Extracción (Librerías de Python):** Se utiliza tecnología basada en Python (`yt-dlp`) para conectar directamente con los servidores de YouTube y descargar/procesar las transcripciones. **Es importante destacar que esta fase es 100% programática y no utiliza Inteligencia Artificial**, lo que la hace extremadamente rápida, económica y predecible.
*   **Capa de Inteligencia Artificial (APIs Externas):** El sistema es agnóstico al proveedor. Dispone de integraciones configurables con tres de los principales proveedores del mercado: **OpenAI, Google Gemini y NanoGPT**.

## 3. Flujo de Trabajo Técnico y de Usuario
El ciclo de vida de una petición está diseñado para minimizar la fricción del usuario y maximizar el rendimiento:

1.  **Ingesta de Datos:** El usuario simplemente copia la URL del vídeo de YouTube y la pega en la aplicación.
2.  **Configuración de Contexto:** Mediante un menú desplegable (slicer), el usuario selecciona el tipo de procesamiento o *prompt* que desea aplicar (por ejemplo, "Resumen ejecutivo", "Puntos clave", etc.).
3.  **Extracción Acelerada (Fase Python):** Al pulsar "Procesar", el backend activa el proceso de extracción de la transcripción. Para contextualizar el rendimiento: descargar y procesar los subtítulos de **un vídeo de 10 minutos toma entre 4 y 10 segundos en total**.
4.  **Procesamiento IA y Consumo de Tokens:** El backend empaqueta la transcripción extraída junto al *prompt* seleccionado y lo envía de forma segura a la API del proveedor configurado. En este paso, el proveedor ejecuta sus modelos de Lenguaje (LLM), analiza el texto, consume los tokens correspondientes por la petición y devuelve la respuesta.
5.  **Renderizado y Presentación:** El sistema recibe el resultado (el resumen) y lo muestra al usuario en pantalla utilizando formato *Markdown*, lo que permite una lectura limpia, estructurada y muy profesional.

## 4. Funcionalidades Avanzadas e Histórico
*   **Generación de Diagramas Visuales:** Si la respuesta generada requiere un apoyo visual, el usuario puede, con apenas 2 o 3 clics, solicitar un esquema. El sistema lanza una nueva petición a la IA para interpretar el resumen y devuelve un diagrama dinámico que se renderiza en pantalla y puede ser descargado.
*   **Persistencia y Exportación:** Todo el flujo de trabajo es persistido. La aplicación almacena el histórico de operaciones, por lo que las transcripciones originales, los resúmenes generados y los diagramas quedan guardados de forma estructurada. El usuario puede volver a consultar trabajos anteriores cuando lo desee y **exportar los resultados a formato PDF** para compartirlos o documentarlos oficialmente.
