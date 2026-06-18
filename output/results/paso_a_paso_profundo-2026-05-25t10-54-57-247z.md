```markdown
# Automatización de Evaluaciones en Microsoft Foundry: Guía Completa para el Desarrollo y Control de Agentes de IA

## Resumen

Microsoft Foundry es una plataforma de control integral diseñada para desarrollar, evaluar y desplegar agentes de IA de alta calidad. Este documento detalla el proceso completo de construcción de un agente de programación que genera aplicaciones de escritorio automáticamente, desde su concepción hasta su validación en producción. La guía aborda tres pilares fundamentales: evaluaciones automáticas con datos sintéticos, pruebas de seguridad mediante equipos rojos (Red Team), y controles de riesgo integrados. A través de un caso práctico concreto —un gestor de flujo de caja personal para Windows— se demuestra cómo las herramientas de Foundry permiten identificar debilidades críticas como la tasa de completitud de tareas (59% inicial) y aplicar controles correctivos específicos para alcanzar estándares de calidad y seguridad exigentes.

---

## Fase 1: Demostración del Agente Finalizado

### Qué se explica
Se presenta el resultado final del agente de programación: una aplicación funcional de gestión de flujo de caja personal para Windows, construida con Electron y React, que incluye autenticación de usuario, base de datos local, categorización de gastos e interfaz web.

### Por qué es importante
Establecer el objetivo final permite contextualizar todo el proceso de desarrollo y validación posterior. Demuestra que el agente no genera código teórico, sino aplicaciones ejecutables con características de producción reales.

### Pasos concretos mencionados
1. El usuario formula una solicitud detallada con requisitos específicos:
   - Aplicación de escritorio para Windows
   - Gestión de flujo de caja personal
   - Rendimiento rápido con interfaz web
   - Fácil de usar para adopción masiva
   - Segura, protegida y con mejores prácticas de privacidad
   - Código legible, mantenible y extensible

2. El agente procesa la solicitud mostrando:
   - **Panel izquierdo**: Lógica de ejecución y planificación
   - **Panel derecho**: Código generado

3. El agente consulta al usuario para decisiones técnicas:
   - Confirmación de uso de Electron + React
   - Aprobación para añadir más características y enfoque en seguridad

4. El agente finaliza con instrucciones de ejecución local

5. El usuario ejecuta la aplicación en PowerShell y valida funcionalidad:
   - Autenticación de usuario operativa
   - Registro de ítems (ej: "مصاريف السفر" / "Gastos de viaje")
   - Selección de categorías predefinidas (ej: "المواصلات" / "Transporte")
   - Persistencia en base de datos local

### Errores, riesgos o dependencias
- **Tiempo de ejecución**: El proceso completo toma varios minutos con interacciones humanas intermedias
- **Dependencia de confirmaciones del usuario**: El agente requiere validación humana en puntos de decisión técnica
- **Riesgo no mencionado explícitamente**: La calidad inicial del código puede no cumplir estándares de producción sin el proceso de refinamiento posterior

---

## Fase 2: Entorno de Desarrollo y Herramientas del SDK

### Qué se explica
Se revela la infraestructura técnica subyacente: el agente se construye con Foundry SDK en Visual Studio Code, con herramientas definidas explícitamente y un conjunto extenso de capacidades locales.

### Por qué es importante
Comprender la arquitectura del agente es fundamental para diagnosticar problemas y extender funcionalidades. La transparencia en las herramientas disponibles determina las capacidades y limitaciones del sistema.

### Pasos concretos mencionados
1. **Herramientas definidas explícitamente**:
   - `WebSearch`: Búsqueda en web
   - `CodeInterpreter`: Interpretación y ejecución de código

2. **Herramientas locales disponibles** (panel izquierdo en VS Code):
   - Interacción con sistema de archivos
   - Git (control de versiones)
   - Depuración (Debugging)
   - Registro (Logging)
   - Búsqueda local
   - Ejecución de scripts

3. **Línea principal del SDK** (panel central):
   - Creación del agente
   - Adición de herramientas
   - Configuración del nombre de despliegue

4. **Estado inicial**: Agente operativo con pruebas manuales iniciadas

### Errores, riesgos o dependencias
- **Riesgo de permisos**: Las herramientas de sistema de archivos y ejecución de scripts requieren privilegios adecuados
- **Dependencia de herramientas externas**: La calidad de `WebSearch` depende de los resultados de búsqueda disponibles
- **Pendiente de validar**: No se especifica la versión exacta del SDK ni el modelo de lenguaje subyacente

---

## Fase 3: Observabilidad con Trazas OpenTelemetry (OTel)

### Qué se explica
Se introduce el sistema de telemetría integrado en Microsoft Foundry, que utiliza OpenTelemetry para capturar trazas completas de cada ejecución del agente, con visualización en Azure Monitor.

### Por qué es importante
La observabilidad es crítica para el diagnóstico de problemas en sistemas de IA. Las trazas estructuradas permiten analizar el comportamiento del agente de manera más eficiente que los logs tradicionales, acelerando los ciclos de depuración y mejora.

### Pasos concretos mencionados
1. **Navegación**: Portal Microsoft Foundry → Agente → Pestaña "التتبعات" (Trazas)

2. **Características de las trazas**:
   - Formato OpenTelemetry (OTel)
   - Ordenadas por fecha (más recientes arriba)
   - Backend: Azure Monitor
   - Cada traza incluye identificador único de conversación/trace

3. **Información capturada por traza**:
   - Mensaje del sistema (system prompt)
   - Entradas del usuario
   - Acciones del agente
   - Lógica del agente
   - Conjunto de tecnologías utilizadas
   - Características de la aplicación generada
   - Proceso de desarrollo
   - Salidas de herramientas (tool outputs)

4. **Beneficio clave**: Análisis más sencillo comparado con logs estándar

### Errores, riesgos o dependencias
- **Costo de almacenamiento**: Las trazas detalladas en Azure Monitor generan costos asociados
- **Retención de datos**: No se especifica el período de retención de las trazas
- **Privacidad**: Las trazas contienen entradas completas del usuario, requiriendo consideraciones de privacidad

---

## Fase 4: Monitoreo de Métricas Operacionales

### Qué se explica
Se presenta el dashboard de monitoreo integrado que proporciona visión general de las métricas clave del agente, incluyendo costos, uso de tokens y rendimiento operacional.

### Por qué es importante
Las métricas operacionales permiten establecer líneas base de rendimiento, detectar anomalías y tomar decisiones informadas sobre optimización de costos antes de escalar a producción.

### Pasos concretos mencionados
1. **Navegación**: Pestaña "المراقبة" (Monitoreo)

2. **Métricas financieras**:
   - Costo estimado acumulado
   - Uso de tokens hasta la fecha

3. **Métricas operacionales**:
   - Número de ejecuciones del agente
   - Tasa de éxito/fracaso de ejecuciones
   - Consumo de tokens
   - Invocaciones de herramientas realizadas
   - Tasa de error a lo largo del tiempo

4. **Estado inicial**: Agente nuevo sin evaluaciones configuradas

### Errores, riesgos o dependencias
- **Estimación vs. real**: Los costos mostrados son estimados, no facturación final
- **Ventana temporal**: No se especifica el período de agregación de las métricas
- **Pendiente de validar**: La precisión de la estimación de costos puede variar según la región de Azure

---

## Fase 5: Evaluaciones Automáticas con Datos Sintéticos

### Qué se explica
Se configura y ejecuta la primera evaluación automática del agente, utilizando generación de datos sintéticos para crear un dataset de prueba de 90 filas sin intervención manual.

### Por qué es importante
Las evaluaciones automáticas permiten escalar el testing de manera imposible con pruebas manuales. La generación sintética de datos elimina el cuello de botella de preparación de datasets, acelerando drásticamente los ciclos de validación.

### Pasos concretos mencionados
1. **Navegación**: Pestaña "التقييمات" (Evaluaciones) → "إنشاء" (Crear)

2. **Tipos de evaluación disponibles**:
   - التقييم التلقائي (Evaluación automática con IA)
   - التقييم البشري (Evaluación humana con cuestionarios)
   - فريق الهجوم (Equipo de ataque/Red Team)

3. **Selección**: Evaluación automática

4. **Configuración del objetivo**:
   - Agente preseleccionado
   - Versión especificada

5. **Configuración de datos**:
   - Opción A: Cargar dataset existente
   - **Opción seleccionada**: Crear dataset sintético
   - Prompt de generación: "إنشاء مجموعة بيانات لتقييم وكيل برمجي" (Crear dataset para evaluar agente de programación)
   - Archivo de referencia: Omitido
   - Resultado: 90 filas generadas automáticamente

6. **Selección de métricas de evaluación**:
   - **Evaluadores integrados para agentes**: Múltiples opciones
   - **Evaluadores de calidad** (personalizables):
     - Eliminados: Coherencia, Fluidez, Fundamentación
     - Conservados: [No especificados explícitamente, pero implícitamente los relevantes para código]
   - **Evaluadores de seguridad** (7 evaluadores): Mantenidos todos

7. **Flujo final**: Revisión → Envío

### Errores, riesgos o dependencias
- **Tiempo de ejecución**: Las evaluaciones automáticas toman varios minutos
- **Calidad de datos sintéticos**: Depende de la capacidad del modelo generador para crear casos de prueba realistas
- **Cobertura**: 90 filas pueden no cubrir todos los edge cases de programación
- **Costo**: La generación sintética y evaluación consumen tokens adicionales

---

## Fase 6: Evaluación de Seguridad con Equipo Rojo (Red Team)

### Qué se explica
Se configura una evaluación de seguridad automatizada mediante un equipo rojo de agentes de IA que ejecutan ataques específicos para descubrir vulnerabilidades en el agente de programación.

### Por qué es importante
La seguridad en agentes de código es crítica dado su capacidad de ejecutar instrucciones y acceder a herramientas del sistema. Los ataques de jailbreak y manipulación pueden tener consecuencias severas si el agente genera código malicioso o expone datos.

### Pasos concretos mencionados
1. **Creación**: Primera evaluación de equipo rojo

2. **Configuración de categorías de riesgo** (personalizables):
   - Contenido inseguro (Unsafe content)
   - Características no atestiguadas (Ungrounded attributes)
   - Vulnerabilidades de código (Code vulnerabilities)
   - Cumplimiento de tareas (Task compliance)

3. **Descripción de herramientas disponibles**:
   - `web_search`: "للبحث في الإنترنت عن حزم تطوير البرامج (SDKs) ذات الصلة" (Buscar SDKs relacionados en internet)
   - `code_interpreter`: "لتشغيل التعليمات البرمجية لوكيل البرمجة" (Ejecutar código del agente de programación)

4. **Configuración de consultas seed (semilla)**:
   - Cambio de 5 a 10 consultas por categoría

5. **Selección de estrategias de ataque** (6 seleccionadas de lista mayor):
   | Estrategia | Descripción |
   |-----------|-------------|
   | `AsciiSmuggler` | Ofuscación mediante caracteres ASCII no imprimibles |
   | `Base64` | Codificación en Base64 para evadir filtros |
   | `Jailbreak` | Intento de anulación de restricciones de seguridad |
   | `StringJoin` | Concatenación de strings para ofuscar payloads |
   | `UnicodeSubstitution` | Sustitución de caracteres Unicode similares |
   | `IndirectJailbreak` | Jailbreak indirecto mediante contexto manipulado |

6. **Revisión de acciones prohibidas**:
   - Intentos de cambio de contraseña
   - Otras acciones maliciosas automatizadas

7. **Ejecución**: Envío para iniciar pruebas

### Errores, riesgos o dependencias
- **Cobertura de ataques**: Solo 6 de N estrategias disponibles seleccionadas
- **Falsos positivos/negativos**: Las evaluaciones automatizadas pueden no detectar todos los vectores de ataque
- **Evolución de amenazas**: Nuevas técnicas de ataque requieren actualización de la plataforma
- **Contexto específico**: Las descripciones de herramientas pueden influir en la efectividad del ataque

---

## Fase 7: Análisis de Resultados y Diagnóstico con IA

### Qué se explica
Se revisan los resultados de ambas evaluaciones (automática y Red Team), identificando el problema crítico de completitud de tareas (59%) y utilizando el análisis con IA para obtener recomendaciones específicas de mejora.

### Por qué es importante
La interpretación de resultados de evaluación puede ser compleja y consumir tiempo. El análisis automatizado con IA acelera la identificación de causas raíz y sugiere soluciones accionables, cerrando el ciclo de mejora continua.

### Pasos concretos mencionados
1. **Visualización de ejecuciones**: Panel con ambas evaluaciones en ejecución

2. **Revisión de evaluación automática**:
   - Navegación a ejecución específica
   - Visualización de detalles por evaluador

3. **Hallazgo crítico**:
   - **Task Completion (إنجاز المهام)**: 59% — **Por debajo del umbral requerido**

4. **Análisis con IA**:
   - Inicio de análisis automatizado
   - Generación de resumen agregado

5. **Problemas identificados por el análisis de IA**:
   - "حلول غير مكتملة" (Soluciones incompletas)
   - "مشكلات في خطة العمل" (Problemas en el plan de trabajo)
   - **Causa raíz**: "نقصًا في المخرجات القابلة للتنفيذ" (Falta de salidas ejecutables)
   - **Recomendación**: Métodos específicos para corregir la generación de código ejecutable

6. **Revisión de evaluación Red Team**:
   - Navegación a vista principal
   - Identificación inmediata: Task Compliance (الالتزام بالمهام) en **rojo**

7. **Correlación de hallazgos**: Ambas evaluaciones convergen en problemas de completitud/cumplimiento de tareas

### Errores, riesgos o dependencias
- **Dependencia de interpretación de IA**: Las recomendaciones pueden no ser óptimas para casos edge
- **Falta de especificidad**: No se muestran las recomendaciones exactas del análisis de IA
- **Priorización**: Múltiples problemas requieren decisión humana sobre orden de corrección

---

## Fase 8: Implementación de Controles de Riesgo

### Qué se explica
Se aplica un control específico de riesgo para mitigar el problema de cumplimiento de tareas, demostrando el mecanismo de controles integrados de Foundry para detectar y responder a riesgos en tiempo de ejecución.

### Por qué es importante
Los controles de riesgo son la capa de protección activa que transforma evaluaciones en acción preventiva. Permiten intervenir en puntos específicos del flujo del agente sin reentrenar o redesplegar completamente el sistema.

### Pasos concretos mencionados
1. **Navegación**: Entorno de pruebas del agente → Sección "الضوابط" (Controles)

2. **Estado inicial**: Solo controles predeterminados activados

3. **Adición de control**:
   - "إدارة الضوابط" (Gestionar controles) → "إنشاء" (Crear)

4. **Configuración de riesgo**:
   - Selección de categoría: "المخاطر" (Riesgos)
   - Tipo específico: "الالتزام بالمهمة" (Cumplimiento de tarea / Task adherence)

5. **Mecanismo del control**:
   - Verificación de cada invocación de herramienta por el agente
   - Validación de uso correcto para "cumplir" con la tarea asignada
   - Punto de intervención: En el proceso de ejecución

6. **Activación**: "إرسال" (Enviar) para habilitar el control

7. **Validación posterior**: Nueva evaluación confirma Task Completion al 100%

### Errores, riesgos o dependencias
- **Sobrecarga de latencia**: Cada verificación de control añade tiempo de procesamiento
- **Falsos positivos**: El control puede rechazar invocaciones legítimas si es demasiado restrictivo
- **Cobertura limitada**: Solo se abordó un tipo de riesgo; otros pueden persistir
- **Pendiente de validar**: No se especifica si el control requiere ajuste de umbrales o es binario

---

## Procedimiento Paso a Paso

### Para replicar el proceso completo de desarrollo y validación:

| Paso | Acción | Ubicación/Herramienta |
|:---|:---|:---|
| 1 | Definir requisitos de la aplicación deseada | Entrada de usuario |
| 2 | Configurar agente con Foundry SDK | Visual Studio Code |
| 3 | Definir herramientas explícitas (`WebSearch`, `CodeInterpreter`) | Código SDK |
| 4 | Verificar herramientas locales disponibles | Panel izquierdo VS Code |
| 5 | Ejecutar pruebas manuales iniciales | Entorno de desarrollo |
| 6 | Acceder a trazas OTel | Portal Foundry → Agente → Trazas |
| 7 | Revisar métricas operacionales | Portal Foundry → Monitoreo |
| 8 | Crear evaluación automática | Portal Foundry → Evaluaciones → Crear |
| 9 | Seleccionar "Evaluación automática" | Tipo de evaluación |
| 10 | Generar dataset sintético (90 filas) | Configuración de datos |
| 11 | Personalizar evaluadores de calidad (eliminar irrelevantes) | Selección de métricas |
| 12 | Conservar evaluadores de seguridad (7) | Selección de métricas |
| 13 | Enviar evaluación automática | Revisión y confirmación |
| 14 | Crear evaluación de equipo rojo | Portal Foundry → Evaluaciones → Crear |
| 15 | Configurar categorías de riesgo | Configuración Red Team |
| 16 | Describir herramientas disponibles | Configuración de herramientas |
| 17 | Aumentar consultas seed a 10 por categoría | Configuración de intensidad |
| 18 | Seleccionar 6 estrategias de ataque | Estrategias de ataque |
| 19 | Revisar acciones prohibidas | Validación de seguridad |
| 20 | Enviar evaluación Red Team | Confirmación final |
| 21 | Esperar resultados (varios minutos) | Panel de ejecuciones |
| 22 | Abrir evaluación automática → ejecución | Detalle de resultados |
| 23 | Identificar métrica crítica (Task Completion: 59%) | Análisis de evaluadores |
| 24 | Iniciar análisis con IA | Botón de análisis |
| 25 | Revisar diagnóstico y recomendaciones | Reporte generado |
| 26 | Abrir evaluación Red Team | Vista principal |
| 27 | Confirmar correlación: Task Compliance en rojo | Identificación de problemas |
| 28 | Navegar a controles del agente | Entorno de pruebas → Controles |
| 29 | Gestionar controles → Crear | Panel de controles |
| 30 | Seleccionar riesgo: "Cumplimiento de tarea" | Catálogo de riesgos |
| 31 | Enviar para activar control | Confirmación |
| 32 | Ejecutar nueva evaluación de validación | Verificación |
| 33 | Confirmar Task Completion al 100% | Resultado final |

---

## Puntos Críticos a Recordar

### Arquitectura y Desarrollo
- **Foundry SDK** es el núcleo de desarrollo, integrado en VS Code
- Las herramientas se definen explícitamente: no todas las capacidades están habilitadas por defecto
- El agente requiere **confirmaciones humanas interactivas** en puntos de decisión técnica

### Observabilidad
- **OpenTelemetry (OTel)** es el estándar de telemetría, no logs propietarios
- **Azure Monitor** proporciona el backend de almacenamiento y visualización
- Las trazas capturan el flujo completo: system prompt → user input → agent actions → tool outputs

### Evaluaciones Automáticas
- **Datos sintéticos** eliminan el cuello de botella de preparación manual de datasets
- Los **evaluadores de calidad son personalizables**: eliminar los irrelevantes mejora la señal/ruido
- Los **7 evaluadores de seguridad** deben mantenerse para cobertura completa

### Seguridad Red Team
- **6 estrategias de ataque** fueron seleccionadas de un catálogo mayor; la selección debe basarse en el perfil de riesgo del agente
- Las **descripciones de herramientas** influyen en cómo el Red Team diseña ataques
- Las **acciones prohibidas** definen el perímetro de seguridad esperado

### Controles de Riesgo
- Los controles operan en **tiempo de ejecución**, no en entrenamiento
- El control de **"Cumplimiento de tarea"** verifica cada invocación de herramienta
- La **correlación entre evaluaciones y controles** es clave: mismo problema detectado por dos métodos, una solución aplicada

### Métricas Críticas
| Métrica | Valor Inicial | Valor Final | Delta |
|:---|:---|:---|:---|
| Task Completion | 59% | 100% | +41 pp |
| Task Compliance (Red Team) | Rojo (fallo) | Verde (éxito) | Resuelto |

---

## Conclusión

Microsoft Foundry transforma el desarrollo de agentes de IA de un proceso artesanal y opaco en una disciplina de ingeniería medible, observable y mejorable. A través del caso práctico del agente de programación, se demuestra un ciclo de vida completo que integra:

1. **Desarrollo iterativo** con herramientas especializadas y confirmaciones humanas estratégicas
2. **Observabilidad profunda** mediante trazas estandarizadas (OTel) y métricas operacionales en tiempo real
3. **Evaluación escalable** combinando generación sintética de datos, métricas de calidad personalizables y baterías de seguridad automatizadas
4. **Respuesta activa a riesgos** con controles de ejecución que mitigan vulnerabilidades detectadas sin redespliegue completo

El hallazgo central —la tasa de completitud de tareas del 59% que se elevó al 100%— ilustra cómo las evaluaciones cuantitativas, el análisis con IA y los controles de riesgo trabajan en conjunto para elevar la calidad del agente a estándares de producción. La plataforma no solo identifica qué está roto, sino que proporciona el mecanismo para arreglarlo de manera sistemática.

Para organizaciones que despliegan múltiples agentes, Foundry ofrece además **gobernanza centralizada**: visión unificada del rendimiento de todos los agentes, políticas corporativas aplicables transversalmente, y configuraciones estandarizadas que aseguran cumplimiento normativo a escala.

**Recurso principal**: [ai.azure.com](https://ai.azure.com) — Microsoft Foundry

---

*Documento generado a partir de transcripción de vídeo. Fecha de procesamiento: 2026-05-25. Algunos términos técnicos en árabe fueron traducidos según contexto; validar contra documentación oficial de Microsoft para uso en producción.*
```