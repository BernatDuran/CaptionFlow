# Automatización de Evaluaciones en Microsoft Foundry

## Resumen

Este documento explica cómo utilizar Microsoft Foundry para automatizar evaluaciones de agentes de IA, cubriendo el ciclo completo desde el desarrollo hasta la producción. Se detalla el proceso de testing manual, evaluaciones automáticas, pruebas de equipo rojo (red team) y aplicación de controles de seguridad. El objetivo es garantizar que los agentes cumplan con estándares de calidad, rendimiento, seguridad y costo antes de su despliegue en producción.

---

## Fases del Contenido

### Fase 1: Introducción y Contexto del Problema

**Qué se explica:**
Se presenta la premisa de que construir aplicaciones de IA (agentes) que cumplan expectativas de calidad, rendimiento, seguridad y costo no depende solo del modelo elegido, sino también de las pruebas, evaluaciones y controles implementados. Se introduce Microsoft Foundry como plataforma de control para desarrollo de agentes.

**Por qué es importante:**
Establece el marco conceptual necesario para entender que el desarrollo de IA requiere más que seleccionar un buen modelo; necesita un proceso riguroso de validación y mejora continua.

**Pasos concretos:**
- No hay pasos operativos en esta fase, es introductoria.

**Errores, riesgos o dependencias:**
- Pendiente de validar: qué versiones específicas de Foundry SDK se requieren.

---

### Fase 2: Demostración del Agente Finalizado

**Qué se explica:**
El presentador muestra el resultado final de un agente de programación que recibe solicitudes de usuarios y busca información para construir aplicaciones automáticamente. Se demuestra con un ejemplo: crear una aplicación de gestión de flujo de caja personal para Windows.

**Por qué es importante:**
Proporciona contexto práctico sobre qué tipo de agente se está desarrollando y qué resultados se esperan antes de entrar en el proceso de evaluación.

**Pasos concretos:**
1. Enviar solicitud al agente: "crear aplicación de escritorio para Windows de gestión de flujos de caja personales"
2. Especificar requisitos: rápida, interfaz web, fácil de usar, segura, cumplimiento de privacidad, fácil de mantener
3. Revisar la lógica de ejecución mostrada en el panel izquierdo
4. Revisar el código React/JavaScript en el panel derecho
5. Confirmar opciones propuestas (Electron + React, añadir características, seguridad)
6. Ejecutar en terminal PowerShell
7. Probar la aplicación: autenticación, añadir gastos, seleccionar categorías

**Errores, riesgos o dependencias:**
- El proceso toma varios minutos con interacciones
- Requiere confirmaciones interactivas del usuario
- Pendiente de validar: requisitos específicos de Electron y React

---

### Fase 3: Entorno de Desarrollo y Herramientas del Agente

**Qué se explica:**
Se muestra el código fuente del agente en Visual Studio Code, incluyendo las herramientas configuradas y el SDK de Foundry.

**Por qué es importante:**
Permite entender la arquitectura base del agente antes de aplicar las evaluaciones y controles.

**Pasos concretos:**
1. Abrir Visual Studio Code con el proyecto del agente
2. Revisar herramientas definidas: `WebSearch` y `CodeInterpreter`
3. Revisar herramientas locales disponibles (panel izquierdo):
   - Interacción con sistema de archivos
   - Git
   - Depuración
   - Logs
   - Búsqueda local
   - Ejecución de scripts
4. Revisar línea principal del SDK que crea el agente, añade herramientas y define nombre de despliegue

**Errores, riesgos o dependencias:**
- Pendiente de validar: versión específica de Foundry SDK utilizada
- Pendiente de validar: configuración específica de WebSearch y CodeInterpreter

---

### Fase 4: Trazas y Monitoreo en Microsoft Foundry Portal

**Qué se explica:**
Se accede al portal de Microsoft Foundry para revisar las trazas (OTel traces) de todas las ejecuciones del agente, alimentadas por Azure Monitor.

**Por qué es importante:**
Permite analizar el comportamiento del agente, identificar problemas y revisar entradas/salidas de cada sesión de forma estructurada.

**Pasos concretos:**
1. Abrir portal Microsoft Foundry
2. Navegar al agente específico
3. Abrir pestaña "Trazas" (Traces)
4. Revisar lista de ejecuciones (más recientes arriba)
5. Clic en cualquier conversación o ID de traza para ver detalles
6. Analizar:
   - Mensaje del sistema
   - Entradas del usuario
   - Acciones del agente
   - Lógica del agente
   - Stack tecnológico usado
   - Características de la aplicación
   - Proceso de desarrollo
   - Salidas de herramientas

**Errores, riesgos o dependencias:**
- Requiere Azure Monitor como backend
- Pendiente de validar: permisos necesarios para acceder a las trazas

---

### Fase 5: Panel de Monitoreo

**Qué se explica:**
Se presenta la pestaña de Monitoreo con métricas clave del agente: costos estimados, uso de tokens, métricas operativas.

**Por qué es importante:**
Proporciona visibilidad sobre el rendimiento operativo y económico del agente antes y después de las evaluaciones.

**Pasos concretos:**
1. Navegar a pestaña "Monitoreo"
2. Revisar:
   - Costo estimado
   - Uso de tokens
   - Número de ejecuciones del agente
   - Completaciones exitosas vs fallidas
   - Consumo de tokens
   - Llamadas a herramientas
   - Tasa de errores a lo largo del tiempo

**Errores, riesgos o dependencias:**
- El agente mostrado es nuevo, sin evaluaciones configuradas aún
- Pendiente de validar: umbrales de alerta configurables

---

### Fase 6: Creación de Evaluación Automática

**Qué se explica:**
Se detalla el proceso de crear una evaluación automática utilizando IA para generar datos de prueba y evaluar múltiples criterios de calidad y seguridad.

**Por qué es importante:**
Automatiza la generación de casos de prueba y la evaluación sistemática del agente, acelerando el ciclo de mejora.

**Pasos concretos:**
1. Navegar a pestaña "Evaluaciones"
2. Clic en "Crear" primera evaluación
3. Seleccionar tipo: "Evaluación automática"
4. Configurar objetivo:
   - Agente ya seleccionado
   - Versión ya seleccionada
5. Configurar datos:
   - Opción A: Cargar dataset existente
   - Opción B: Crear dataset sintético (recomendado para ahorrar tiempo)
6. Para dataset sintético:
   - Especificar número de filas deseadas
   - Añadir instrucción: "crear dataset para evaluar agente de programación"
   - Omitir archivo de referencia
   - Clic en "Confirmar"
   - Se generan automáticamente 90 filas de datos de prueba
7. Seleccionar criterios de evaluación:
   - Herramientas de evaluación integradas para agentes
   - Herramientas de evaluación de calidad (editable)
   - Eliminar criterios innecesarios: Coherencia, Fluidez, Baseline
   - Mantener todos los evaluadores de seguridad (7 evaluadores)
8. Revisar configuración
9. Enviar evaluación

**Errores, riesgos o dependencias:**
- Las evaluaciones automáticas pueden tomar varios minutos
- Pendiente de validar: qué evaluadores específicos componen los 7 de seguridad
- Pendiente de validar: formato del archivo de referencia opcional

---

### Fase 7: Configuración de Pruebas de Equipo Rojo (Red Team)

**Qué se explica:**
Se configura una evaluación de equipo rojo para detectar vulnerabilidades de seguridad mediante ataques automatizados.

**Por qué es importante:**
Las pruebas de equipo rojo son críticas para identificar vulnerabilidades de seguridad antes del despliegue en producción.

**Pasos concretos:**
1. Crear nueva evaluación de tipo "Equipo de ataque" (Attack Team)
2. Revisar configuración estándar de categorías de riesgo (editable)
3. Verificar categorías de verificación:
   - Categorías no seguras
   - Atributos no instanciados
   - Vulnerabilidades de código
   - Cumplimiento de tareas
4. Configurar descripción de herramientas accesibles:
   - `web_search`: "buscar en internet SDKs relevantes"
   - `code_interpreter`: "ejecutar código para agente de programación"
5. Guardar configuración
6. Modificar consultas semilla (seed queries):
   - Cambiar de 5 a 10 por categoría para mayor cobertura
7. Seleccionar estrategias de ataque:
   - AsciiSmuggler
   - Base64
   - Jailbreak
   - StringJoin
   - UnicodeSubstitution
   - IndirectJailbreak
8. Revisar acciones prohibidas:
   - Intentos de cambio de contraseña
   - Otras acciones maliciosas
9. Enviar evaluación

**Errores, riesgos o dependencias:**
- Pendiente de validar: lista completa de categorías de riesgo disponibles
- Pendiente de validar: lista completa de estrategias de ataque disponibles
- Pendiente de validar: lista completa de acciones prohibidas

---

### Fase 8: Análisis de Resultados de Evaluación Automática

**Qué se explica:**
Se revisan los resultados de la evaluación automática, identificando problemas y utilizando IA para analizar las causas.

**Por qué es importante:**
Permite identificar problemas específicos de rendimiento y obtener sugerencias de mejora automatizadas.

**Pasos concretos:**
1. Abrir evaluación automática completada
2. Clic en "Ejecutar" para ver reporte
3. Revisar detalles de cada evaluador
4. Identificar métricas problemáticas:
   - Tasa de completación de tareas: 59% (por debajo del umbral)
5. Utilizar análisis con IA:
   - Clic en "Iniciar análisis"
   - Revisar análisis agregado de problemas principales
6. Problemas identificados:
   - "Soluciones incompletas"
   - "Problemas en plan de acción"
   - "Falta de salidas ejecutables"
7. Revisar sugerencias de corrección específicas

**Errores, riesgos o dependencias:**
- Pendiente de validar: cuál es el umbral aceptable para completación de tareas
- Pendiente de validar: cómo se calcula el porcentaje de completación

---

### Fase 9: Análisis de Resultados de Equipo Rojo

**Qué se explica:**
Se revisan los resultados de las pruebas de equipo rojo, identificando vulnerabilidades de seguridad.

**Por qué es importante:**
Permite detectar y corregir vulnerabilidades antes del despliegue.

**Pasos concretos:**
1. Abrir evaluación de equipo rojo completada
2. Navegar a vista principal
3. Clic para ver problemas
4. Identificar problemas críticos:
   - Cumplimiento de tareas en rojo (relacionado con completación de tareas)

**Errores, riesgos o dependencias:**
- Pendiente de validar: cómo se representa visualmente la severidad de los problemas

---

### Fase 10: Aplicación de Controles Correctivos

**Qué se explica:**
Se aplica un control de "Cumplimiento de tareas" para resolver el problema identificado en las evaluaciones.

**Por qué es importante:**
Demuestra cómo los controles integrados pueden resolver problemas detectados automáticamente.

**Pasos concretos:**
1. Navegar a entorno de prueba del agente
2. Desplazarse a sección "Controles"
3. Verificar controles por defecto activados
4. Clic en "Gestionar controles"
5. Clic en "Crear"
6. Seleccionar tipo de riesgo: "Cumplimiento de tareas"
7. Este control verifica llamadas a herramientas del agente para asegurar uso correcto
8. Clic en "Enviar" para activar control
9. Ejecutar nueva evaluación para verificar corrección
10. Confirmar que "Completación de tareas" ahora está resuelta
11. Verificar que todas las métricas cumplen objetivos de calidad

**Errores, riesgos o dependencias:**
- Pendiente de validar: lista completa de controles disponibles
- Pendiente de validar: configuración avanzada del control de cumplimiento de tareas

---

### Fase 11: Capacidades Adicionales de Foundry

**Qué se explica:**
Se menciona que Foundry ofrece capacidades adicionales para gestión de múltiples agentes, políticas centralizadas y configuraciones de cumplimiento.

**Por qué es importante:**
Contextualiza que las funcionalidades mostradas son parte de un ecosistema más amplio de gobernanza de IA.

**Pasos concretos:**
- No hay pasos operativos en esta fase.

**Errores, riesgos o dependencias:**
- Pendiente de validar: detalles específicos de políticas centralizadas
- Pendiente de validar: cómo escalar a múltiples agentes

---

## Procedimiento Paso a Paso

### Configuración Inicial del Agente
1. Crear agente utilizando Foundry SDK en Visual Studio Code
2. Definir herramientas: `WebSearch` y `CodeInterpreter`
3. Configurar nombre de despliegue
4. Ejecutar pruebas manuales iniciales

### Configuración de Monitoreo
1. Acceder a portal Microsoft Foundry (ai.azure.com)
2. Abrir el agente
3. Navegar a pestaña "Trazas" para revisar ejecuciones
4. Navegar a pestaña "Monitoreo" para revisar métricas

### Crear Evaluación Automática
1. Pestaña "Evaluaciones" → "Crear"
2. Seleccionar "Evaluación automática"
3. Crear dataset sintético con instrucción específica
4. Seleccionar criterios de evaluación relevantes
5. Enviar y esperar completación

### Crear Evaluación de Equipo Rojo
1. Crear evaluación tipo "Equipo de ataque"
2. Configurar descripciones de herramientas
3. Ajustar consultas semilla (recomendado: 10 por categoría)
4. Seleccionar estrategias de ataque relevantes
5. Enviar y esperar completación

### Analizar Resultados
1. Abrir evaluación automática → revisar métricas
2. Usar análisis con IA para identificar problemas
3. Abrir evaluación de equipo rojo → revisar problemas de seguridad
4. Identificar problemas críticos (ej: cumplimiento de tareas)

### Aplicar Controles Correctivos
1. Navegar a entorno de prueba del agente
2. Sección "Controles" → "Gestionar controles" → "Crear"
3. Seleccionar riesgo detectado
4. Activar control
5. Ejecutar nueva evaluación para verificar

---

## Puntos Críticos a Recordar

1. **Las evaluaciones automáticas pueden generar datasets sintéticos**, ahorrando tiempo significativo en preparación de datos de prueba.

2. **El análisis con IA integrado** proporciona diagnósticos automáticos de problemas y sugerencias de corrección específicas.

3. **Las pruebas de equipo rojo son esenciales** para detectar vulnerabilidades de seguridad antes del despliegue en producción.

4. **Los controles se aplican en tiempo de ejecución** y verifican que las llamadas a herramientas cumplan con la tarea asignada.

5. **Las trazas OTel con Azure Monitor** permiten análisis detallado de cada sesión del agente.

6. **El cumplimiento de tareas (task adherence)** fue el problema principal detectado, con 59% de tasa de completación inicial.

7. **Foundry permite gestión centralizada** de políticas y configuraciones para múltiples agentes.

---

## Conclusión

Microsoft Foundry proporciona un ecosistema completo para automatizar la evaluación de agentes de IA, integrando pruebas automáticas, análisis de seguridad mediante equipo rojo, y controles correctivos que se activan en tiempo de ejecución. El flujo demostrado muestra cómo un agente con problemas de completación de tareas puede ser diagnosticado automáticamente, corregido mediante controles integrados, y validado nuevamente hasta cumplir con los objetivos de calidad. La plataforma aborda tanto aspectos de calidad funcional como de seguridad, permitiendo que los desarrolladores lleven sus agentes a producción con mayor confianza y menor esfuerzo manual. Para comenzar, se puede acceder a Microsoft Foundry en ai.azure.com.

---

¿Te gustaría que profundice en algún aspecto específico de las evaluaciones automáticas o de las configuraciones de equipo rojo?