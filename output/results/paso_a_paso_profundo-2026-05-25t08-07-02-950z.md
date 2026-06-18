# 📘 Actualizaciones de Power Platform - Mayo 2026: Guía Técnica y Didáctica

## 📝 Resumen Inicial
Este documento sintetiza las actualizaciones de Power Platform correspondientes a mayo de 2026, organizadas en seis áreas estratégicas: Power Apps, Agentic Apps, Generative Pages, migración de InfoPath, modernización de controles y mejoras de diseño/datos. El enfoque principal recae en la transición de características clave a disponibilidad general (GA), la integración profunda con Microsoft 365 Copilot mediante herramientas personalizadas y agentes declarativos, y la automatización de migraciones legacy mediante un agente de codificación alojado en GitHub. Además, se introducen mejoras sustanciales en el diseño responsivo (Grid Container) y en la gestión de datos tabulares (New Data Grid), consolidando un ecosistema más productivo, visual y alineado con flujos de trabajo colaborativos impulsados por IA.

---

## 🔍 Explicación por Bloques Lógicos

### 🔹 Bloque 1: User-Defined Functions (UDF) en Canvas Apps
- **Qué se explica:** Las funciones definidas por el usuario (UDF) en aplicaciones Canvas, previamente en vista previa, alcanzan el estado de General Availability (GA).
- **Por qué es importante:** Permite el uso productivo y escalable de lógica reutilizable en Power Fx, eliminando la barrera de "solo para pruebas" y facilitando el mantenimiento del código en entornos corporativos.
- **Pasos concretos mencionados:** Habilitar y utilizar UDF directamente en aplicaciones Canvas para actividades diarias y entornos de producción.
- **Errores, riesgos o dependencias:** Ninguno explícito. Solo requiere actualizar el entorno a la versión que soporte la versión GA.

### 🔹 Bloque 2: Agentic Apps y Conversaciones en Apps (Model-Driven + M365 Copilot)
- **Qué se explica:** Introducción de herramientas personalizadas (custom tools) e interfaces ricas (rich UI) para conversaciones basadas en apps, específicamente en aplicaciones Model-Driven.
- **Por qué es importante:** Extiende la integración con Microsoft 365 Copilot más allá del acceso a datos, permitiendo flujos de trabajo colaborativos, insights visuales y respuestas guiadas directamente dentro de la interfaz de chat.
- **Pasos concretos mencionados:**
  1. Los makers definen lógica de negocio específica en herramientas MCP de Copilot.
  2. Los widgets Fluent UI renderizan los elementos visuales.
  3. Los agentes declarativos orquestan las acciones, combinan datos y entregan respuestas contextuales.
- **Errores, riesgos o dependencias:** Requiere conocimiento previo de MCP tools, Fluent UI widgets y arquitectura de agentes declarativos. La dependencia técnica recae en la correcta configuración de la orquestación entre estos tres componentes.

### 🔹 Bloque 3: Generative Pages con Soporte de Entrada/Contexto
- **Qué se explica:** Las Generative Pages dentro de Dynamics 365 ahora admiten entrada de datos y lectura de contexto desde registros existentes.
- **Por qué es importante:** Anteriormente carecían de soporte de contexto; ahora permiten mostrar y manipular datos dinámicamente según el registro activo, mejorando la personalización y la experiencia de usuario.
- **Pasos concretos mencionados:** Utilizar el contexto del registro para configurar la visualización y el comportamiento de los datos en la página generativa.
- **Errores, riesgos o dependencias:** Ninguno detallado. Se asume que la configuración se realiza mediante mapeo de contexto a nivel de página.

### 🔹 Bloque 4: Migración de InfoPath mediante Coding Agent
- **Qué se explica:** Herramienta desarrollada por el equipo Power CAT de Microsoft, disponible en GitHub, que utiliza un agente de codificación para convertir formularios InfoPath legacy en aplicaciones Canvas modernas.
- **Por qué es importante:** Reduce drásticamente el esfuerzo manual de migración, actuando como un "game changer" para organizaciones con deuda técnica en InfoPath.
- **Pasos concretos mencionados:**
  1. Acceder al repositorio de GitHub proporcionado.
  2. El agente de codificación lee el gabinete de InfoPath mediante un archivo XSD.
  3. Analiza (parses) la definición del formulario.
  4. Genera automáticamente la estructura de la aplicación Canvas.
  5. El desarrollador edita y publica la app resultante.
  *Detrás de escena:* Utiliza `Canvas Authoring MCP Server` + `Power InfoPath Migration Skill`.
- **Errores, riesgos o dependencias:** La generación automática no es 100% final; requiere revisión, edición manual y publicación posterior. Dependencia estricta de la disponibilidad del archivo XSD y del repositorio de GitHub.

### 🔹 Bloque 5: Actualización de Controles Modernos (Modern Controls)
- **Qué se explica:** Mejoras en controles Canvas como Icon, Dropdown, Button y Slider, cerrando brechas funcionales previas.
- **Por qué es importante:** Elimina la necesidad de usar controles clásicos por limitaciones técnicas (ej. el Icon ahora soporta `OnSelect`), unifica la experiencia visual con Fluent Themes y mejora el rendimiento de renderizado.
- **Pasos concretos mencionados:** Reemplazar controles clásicos por sus versiones modernas, configurar `OnSelect` en íconos, aplicar temas Fluent y flyouts en dropdowns, y aprovechar el renderizado limpio de sliders y botones.
- **Errores, riesgos o dependencias:** Migración progresiva recomendada. No se reportan incompatibilidades, pero se sugiere validar comportamientos en apps existentes antes de reemplazar masivamente.

### 🔹 Bloque 6: Diseño Responsivo y Gestión de Datos (Grid Container & New Data Grid)
- **Qué se explica:**
  - `Grid Container` alcanza GA con autoría drag & drop, reemplazando posicionamiento X/Y tradicional.
  - `New Data Grid Control` entra en vista previa con funcionalidades avanzadas de tabla.
- **Por qué es importante:** Facilita el diseño responsivo mediante CSS Grid moderno sin código complejo. El nuevo grid mejora la interacción con datos tabulares en Canvas.
- **Pasos concretos mencionados:**
  - *Grid Container:* Arrastrar y soltar en celdas, redimensionar, usar handles de span, activar scroll, utilizar deshacer/rehacer.
  - *New Data Grid:* Configurar barra de búsqueda, columnas ordenables, selección múltiple y tipos de columna (texto, número, teléfono, email, URL, botón).
- **Errores, riesgos o dependencias:** `Grid Container` es GA y listo para producción. `New Data Grid` está en preview y presenta "un par de limitaciones" no especificadas en la transcripción. **Pendiente de validar:** naturaleza exacta de dichas limitaciones y compatibilidad con formularios existentes.

---

## 🛠️ Procedimiento Paso a Paso

> ⚠️ *Nota: Los pasos se extraen estrictamente de la transcripción. No se añaden interacciones de UI no mencionadas.*

### 📦 Migración de InfoPath a Canvas Apps (Flujo principal documentado)
1. **Acceder al repositorio:** Abrir el enlace de GitHub proporcionado por Microsoft (Power CAT team).
2. **Preparar el archivo fuente:** Asegurar la disponibilidad del archivo `.xsd` que define el formulario InfoPath legacy.
3. **Ejecutar el agente de codificación:** El sistema lee el gabinete de InfoPath mediante el XSD y analiza su definición.
4. **Generación automática:** El agente construye la estructura base de la aplicación Canvas utilizando `Canvas Authoring MCP Server` y `Power InfoPath Migration Skill`.
5. **Revisión y publicación:** Abrir la app generada en el entorno de desarrollo, realizar ajustes manuales necesarios y publicar la solución.

### 🧩 Implementación de Características GA y Preview
| Característica | Acción requerida según transcripción |
|----------------|--------------------------------------|
| **UDF (GA)** | Habilitar en Canvas App y comenzar a definir funciones reutilizables en Power Fx para producción. |
| **Agentic Apps (Model-Driven)** | Definir lógica en MCP tools → Configurar widgets Fluent UI → Orquestar con agentes declarativos para respuestas guiadas. |
| **Generative Pages** | Vincular la página al contexto del registro activo y mapear campos de entrada/salida según necesidad. |
| **Modern Controls** | Sustituir controles clásicos por modernos, asignar `OnSelect` a íconos, aplicar Fluent themes a dropdowns. |
| **Grid Container (GA)** | Insertar contenedor → Arrastrar controles a celdas → Ajustar spans/redimensionar → Activar scroll y deshacer/rehacer. |
| **New Data Grid (Preview)** | Añadir control → Configurar tipos de columna → Activar búsqueda, ordenamiento y selección múltiple. |

---

## ⚠️ Puntos Críticos a Recordar

- ✅ **Estado de lanzamiento:**
  - `GA (Producción):` User-Defined Functions, Grid Container.
  - `Preview/Early Access:` New Data Grid Control, Herramienta de migración InfoPath (vía GitHub).
- 🔧 **Dependencias técnicas clave:**
  - Migración InfoPath requiere archivo `.xsd` válido y acceso al repositorio de GitHub.
  - Agentic Apps depende de la correcta integración entre MCP tools, Fluent UI widgets y agentes declarativos.
- 🚧 **Limitaciones conocidas:**
  - El `New Data Grid Control` tiene limitaciones no especificadas en el vídeo. **Pendiente de validar:** alcance técnico y restricciones de uso en producción.
  - La migración automática de InfoPath genera una base funcional, pero **siempre requiere edición manual y publicación** antes de su despliegue.
- 🎨 **Cambio de paradigma en diseño:** El `Grid Container` reemplaza explícitamente el posicionamiento X/Y tradicional, alineándose a CSS Grid moderno. Se recomienda migrar layouts responsivos progresivamente.
- 🔗 **Recursos externos:** El enlace al repositorio de GitHub se menciona como disponible en la descripción del vídeo, pero no se proporciona en la transcripción. **Pendiente de validar:** URL exacta y requisitos de ejecución local/cloud.

---

## ✅ Conclusión Final

Las actualizaciones de mayo de 2026 marcan una transición clara hacia un Power Platform más maduro, productivo y alineado con la inteligencia artificial generativa. La disponibilidad general de funciones como UDF y Grid Container elimina barreras históricas de desarrollo, mientras que la integración de Agentic Apps con M365 Copilot redefine la interacción usuario-sistema en entornos Model-Driven. La herramienta de migración de InfoPath, aunque aún requiere validación manual, representa un salto cualitativo en la modernización de deuda técnica legacy.

Para los makers, la recomendación estratégica es: priorizar la adopción de las características GA en nuevos proyectos, evaluar cuidadosamente los controles y grids en preview en entornos de prueba, y documentar los flujos de migración de InfoPath antes de escalarlos. La plataforma avanza hacia un modelo donde el diseño responsivo, la reutilización de lógica y la orquestación inteligente convergen para reducir la fricción técnica y acelerar la entrega de valor empresarial.