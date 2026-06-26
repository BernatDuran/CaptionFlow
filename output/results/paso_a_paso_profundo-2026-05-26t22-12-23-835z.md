# Guía Técnica Comparativa: Claude Code vs. ChatGPT Codex (Análisis de Rendimiento y Flujo de Trabajo)

## Resumen Ejecutivo
Este documento transforma el análisis comparativo realizado en mayo de 2026 entre **Claude Code** (Anthropic) y **ChatGPT Codex** (OpenAI) en una guía técnica estructurada. Se examinan las diferencias arquitectónicas, económicas y prácticas, destacando que Claude Code ofrece mayor personalización y creatividad, mientras que Codex prioriza un flujo de envío unificado y eficiencia en tokens. Se incluyen resultados empíricos de tres casos de uso (informe PDF, landing page, dashboard) métricas de costo/tiempo y políticas de integración con herramientas de terceros. El objetivo es proporcionar un criterio claro para seleccionar la herramienta adecuada según la tarea específica, evitando la dependencia de una única plataforma.

---

## 1. Fundamentos y Ecosistema de Herramientas

### Qué se explica
Se define la naturaleza de ambas herramientas como **agentes de codificación** (coding agents) capaces de planificar, editar archivos, ejecutar comandos y solicitar permisos. Se detallan las plataformas donde operan y los modelos subyacentes.

### Por qué es importante
Entender el entorno de ejecución y los modelos es crucial para configurar el flujo de trabajo correcto y evitar confusiones con versiones legacy (ej. el modelo Codex de 2021).

### Pasos concretos y entidades mencionadas
*   **Plataformas disponibles:**
    *   Versión Terminal (CLI).
    *   Extensión para **VS Code** (compatible con otros IDEs como Cursor).
    *   Aplicación de escritorio completa (Mac y Windows).
    *   Versión Web (Research Preview) accesible desde navegador o móvil.
*   **Modelos Subyacentes:**
    *   **Claude Code:** Ejecuta **Opus** (modelo más inteligente), Sonnet o Haiku. (En la prueba: Opus 4.7).
    *   **ChatGPT Codex:** Ejecuta familia **GPT** y **GPT-Codex** (específico para código). Incluye **GPT-Codex-Spark** (más rápido/pequeño, en research preview). (En la prueba: GPT-5.5).
*   **Acceso:**
    *   Codex incluido en planes ChatGPT (Free, Plus, Pro, Business, Enterprise).
    *   Claude Code requiere suscripción paga (no disponible en plan free).

### Errores, riesgos o dependencias
*   **Riesgo de confusión:** El nuevo Codex es un sistema agéntico completo, no el modelo API antiguo de 2021.
*   **Dependencia de modelo:** El rendimiento varía según la versión del modelo (ej. Opus 4.7 vs. GPT-5.5); los resultados pueden cambiar con futuras actualizaciones (Opus 4.8, GPT-6).

---

## 2. Diferenciadores Arquitectónicos y Funcionales

### Qué se explica
Se contrasta la filosofía de diseño: Claude Code como un **sistema de flujo de trabajo personalizable** vs. Codex como una **máquina opinada de envío unificado** (unified shipping).

### Por qué es importante
Define qué herramienta se adapta mejor a la necesidad de control granular (Claude) versus la necesidad de velocidad y flujo integrado hasta producción (Codex).

### Pasos concretos y entidades mencionadas
*   **Ventajas de Claude Code (Personalización):**
    *   **Hooks:** 30 eventos de disparo automatizado (ej. al iniciar sesión, al crear tarea). Codex tiene ~6.
    *   **Sub-agentes automáticos:** Claude puede spawnear agentes especialistas (planner, reviewer) sin petición explícita. Codex requiere petición explícita.
    *   **Comandos Slash avanzados:**
        *   `{slash} ultra plan`: Envía planificación a sesión cloud para revisión con comentarios inline.
        *   `{slash} ultra review`: Revisión de código multi-agente con hallazgos reproducidos.
        *   `{slash} loop`: Ejecución recurrente (ej. cada 20 min) para mantenimiento o tareas programadas.
    *   **Canales (Channels):** Server MCP para recibir eventos de Telegram, Discord o iMessage dentro de la sesión.
    *   **Claude Agent SDK:** Permite construir agentes propios (Python/TypeScript).
    *   **Enterprise Off:** Soporte para Bedrock, Vertex AI, Microsoft Foundry.
*   **Ventajas de ChatGPT Codex (Flujo Unificado):**
    *   **Git Work Trees nativos:** Copias de trabajo separadas por hilo para ejecutar tareas en paralelo sin conflictos.
    *   **Navegador in-app:** Dentro de la desktop app para previsualizar trabajo y dejar comentarios visuales.
    *   **Computer Use (QA):** Flujo pulido para testing de apps (clics, bugs, severidad, pasos para reproducir).
    *   **Integración GitHub:** Mención `@Codex` en PR o Issues para lanzar sandbox en la nube sin setup.
    *   **Comando `{slash} goal`:** (Experimental/Feature flag) Define objetivo con condición de parada verificable; el agente trabaja hasta completarlo.
    *   **Generación de Imágenes:** Acceso nativo a **GPT Image 2** dentro de la app (Claude requiere herramienta externa).

### Errores, riesgos o dependencias
*   **Ambigüedad:** `{slash} goal` en Codex está detrás de un feature flag (aunque accesible).
*   **Dependencia:** La capacidad de generación de imágenes en Codex depende de la integración de GPT Image 2.
*   **Riesgo:** Claude Code requiere más configuración inicial para aprovechar su potencial (hooks, skills).

---

## 3. Economía, Límites y Políticas de Uso

### Qué se explica
Se analizan los costos de suscripción, el consumo de tokens y, críticamente, las políticas sobre el uso de herramientas de terceros (wrappers).

### Por qué es importante
Impacta directamente en el presupuesto operativo y en la viabilidad legal/técnica de usar agentes externos como Open Claw o Hermes.

### Pasos concretos y entidades mencionadas
*   **Estructura de Precios:**
    *   **Claude:** Pro ($20/mes), Max 5X ($100/mes), Max 20X ($200/mes).
    *   **Codex:** Incluido en ChatGPT Free, Plus ($20), Pro ($200). Promo temporal: Tier $100 da 2X uso hasta 31 de mayo.
*   **Ventanas de Contexto:**
    *   Claude (Opus/Sonnet): 1 millón de tokens.
    *   Codex (GPT latest): ~256,000 tokens.
*   **Política de Terceros (Wrappers):**
    *   **OpenAI:** Permite usar suscripción de ChatGPT en herramientas como **Open Claw** o **Hermes Agent** (endosado por Sam Altman).
    *   **Anthropic:** **No permite** usar suscripción de Claude.ai en productos de terceros sin aprobación previa explícita.

### Errores, riesgos o dependencias
*   **Riesgo de Límites:** Usuarios reportan alcanzar límites de sesión/semanales en Claude Code más rápido que en Codex.
*   **Riesgo Legal:** Usar Claude en wrappers de terceros sin aprobación viola los términos según la documentación del SDK.
*   **Costo Real:** Aunque la suscripción sea fija, el consumo de tokens afecta la velocidad con la que se agotan los límites de uso.

---

## 4. Experimento Comparativo (Metodología y Resultados)

### Qué se explica
Se detalla una prueba controlada donde ambas herramientas reciben los mismos 3 prompts para evaluar rendimiento real, costo y calidad visual.

### Por qué es importante
Proporciona evidencia empírica más allá de las especificaciones teóricas, mostrando cómo se comportan en tareas de frontend, investigación y datos.

### Pasos concretos y entidades mencionadas
*   **Metodología:**
    *   Entorno: Desktop Apps respectivas.
    *   Modelos: Codex (GPT-5.5 High), Claude (Opus 4.7 High).
    *   Medición: Lectura de logs **JSONL** de la sesión para extraer tiempo, tokens y cache.
*   **Casos de Uso (Prompts):**
    1.  **Informe de Investigación PDF:** Reporte de automatización para SMBs con branding.
    2.  **Landing Page:** Página completa con logo y referencias visuales.
    3.  **Dashboard Analítico:** Datos interactivos simulados con filtros y gráficos.
*   **Resultados Cuantitativos (Totales 3 runs):**
    *   **Tiempo:** Codex ~26 min total | Claude ~15 min total.
    *   **Tokens:** Ambos ~6 millones totales, pero distribución diferente.
    *   **Costo API (Referencial):** Claude más caro debido a tokens de salida (output).
*   **Resultados Cualitativos:**
    *   **Dashboard:** Claude ganó en diseño (dark mode, gradientes, hover) y velocidad (2 min vs 8 min de Codex).
    *   **Landing Page:** Claude ganó en diseño base (animaciones, fuentes), aunque olvidó el logo (fácil de corregir). Codex más rápido en este caso específico (3 min vs 4:39).
    *   **PDF:** Codex ganó en eficiencia de tokens (2.8M vs 4.7M) y espaciado visual, aunque Claude tuvo mejor header/footer.

### Errores, riesgos o dependencias
*   **Outliers:** Un experimento de Claude fue muy rápido (2 min) comparado con Codex (8 min), lo que skewea el promedio.
*   **Eficiencia:** Codex genera consistentemente 2-5x menos tokens de salida (output tokens), lo que reduce costos y consumo de límites.
*   **Validación:** Los datos de investigación no fueron verificados factualmente sentence-by-sentence.

---

## 5. Criterios de Selección y Mindset

### Qué se explica
Se sintetizan las recomendaciones finales sobre cuándo usar cada herramienta y se aborda la portabilidad del código generado.

### Por qué es importante
Permite al usuario tomar decisiones operativas inmediatas y reduce el miedo al "vendor lock-in".

### Pasos concretos y entidades mencionadas
*   **Usar Claude Code cuando:**
    *   Trabajo frontend complejo donde importa la calidad visual.
    *   Se requiere planificación profunda o brainstorming (sensación más "creativa").
    *   Se necesitan auto-delegación de sub-agentes y hooks personalizados.
    *   Entorno Enterprise (Bedrock/Vertex).
    *   Se usa el Agent SDK para embeder agentes.
*   **Usar ChatGPT Codex cuando:**
    *   Tareas pesadas de investigación web y documentos estructurados.
    *   Se busca un flujo de envío único (work trees, review, push en una app).
    *   Se necesitan objetivos de larga duración (`{slash} goal`).
    *   Integración directa con GitHub (`@Codex`).
    *   Se requiere generación de imágenes nativa.
    *   Se usan herramientas de terceros (Open Claw).
*   **Mindset de Portabilidad:**
    *   El código son archivos en carpetas (Markdown, JSON, Python).
    *   Se puede mover el proyecto entre agentes (ej. de Claude a Codex) pidiendo al nuevo agente que analice la estructura.
    *   Solo hay que ajustar archivos de configuración menores (ej. `claw.md` a `agents.md`).

### Errores, riesgos o dependencias
*   **Riesgo de Obsolescencia:** Las características específicas (precios, modelos) cambian rápidamente (nota del video: mayo 2026).
*   **Dependencia:** No bloquearse en una herramienta; mantener la portabilidad del proyecto.

---

## Procedimiento Paso a Paso para la Selección

Siga este flujo lógico para decidir qué herramienta implementar en su próximo proyecto:

1.  **Defina la Naturaleza de la Tarea:**
    *   ¿Es frontend/visualmente intensiva? -> **Priorice Claude Code**.
    *   ¿Es investigación/documentación o backend lógico? -> **Priorice Codex**.
    *   ¿Es una tarea de larga duración sin supervisión constante? -> **Priorice Codex (`/goal`)**.
2.  **Evalúe la Infraestructura Existente:**
    *   ¿Usa herramientas de terceros (Open Claw/Hermes)? -> **Seleccione Codex** (política permisiva).
    *   ¿Requiere hosting en Bedrock/Vertex? -> **Seleccione Claude Code**.
    *   ¿Necesita generación de imágenes sin APIs externas? -> **Seleccione Codex**.
3.  **Verifique Límites y Presupuesto:**
    *   Si tiene suscripción ChatGPT existente -> **Codex incluido**.
    *   Si necesita mayor ventana de contexto (1M tokens) -> **Claude Code**.
    *   Si preocupa el agotamiento rápido de límites de sesión -> **Considere Codex** (menor uso de tokens de output).
4.  **Configure el Flujo de Trabajo:**
    *   Para Claude: Defina hooks y skills en carpetas locales para automatización.
    *   Para Codex: Utilice work trees para paralelizar tareas en la desktop app.
5.  **Mantenga la Portabilidad:**
    *   Asegúrese de que la configuración del agente (ej. instrucciones system) esté en archivos versionables en el repositorio.
    *   Documente dependencias para facilitar la migración futura entre agentes.

---

## Puntos Críticos a Recordar

*   **Eficiencia de Tokens:** Codex tiende a ser más conciso en sus respuestas (menos tokens de output), lo que implica menor costo real y menor saturación de límites de uso comparado con Claude en tareas complejas.
*   **Política de Terceros:** OpenAI permite explícitamente el uso de su suscripción en wrappers de agentes (Open Claw), mientras que Anthropic lo prohíbe sin aprobación. Esto es decisivo si usa ecosistemas abiertos.
*   **Sensación de Uso:** Claude se percibe más "creativo" y proactivo (pushback), ideal para planificación. Codex se percibe más "ejecutor" y obediente, ideal para implementación directa.
*   **Fecha de Validez:** Los datos de modelos (GPT-5.5, Opus 4.7) y precios corresponden a **mayo de 2026**. Verificar documentación oficial si se consulta este guía en el futuro.
*   **Interoperabilidad:** No existe lock-in técnico real; los proyectos son portables entre agentes mediante la gestión adecuada de archivos de configuración y código fuente.

---

## Conclusión Final

La comparación entre **Claude Code** y **ChatGPT Codex** no revela un ganador absoluto, sino dos filosofías complementarias. **Claude Code** se posiciona como un sistema operativo de ingeniería altamente personalizable, ideal para quienes desean moldear el agente mediante hooks, SDKs y flujos complejos, destacando en tareas que requieren creatividad visual y planificación profunda. **ChatGPT Codex**, por otro lado, ofrece una experiencia de "envío unificado" más pulida, con mejor integración nativa de git, navegador y herramientas de QA, sobresaliendo en eficiencia de tokens y ejecución obediente de instrucciones.

La recomendación estratégica es **no depender exclusivamente de una herramienta**. Dado que el código generado es portable, el enfoque óptimo es utilizar **Claude Code para la fase de estrategia, diseño y planificación**, y **Codex para la ejecución, revisión y despliegue**, o viceversa según la tarea específica. Mantener una mentalidad de portabilidad asegura que el usuario se beneficie de las innovaciones de ambas plataformas sin quedar atrapado en un único ecosistema.