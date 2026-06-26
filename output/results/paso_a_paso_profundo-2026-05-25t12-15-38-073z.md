# Cómo Crear 3 SaaS de $100.000/mes: Ideas, Clientes e IA

## Resumen

Miguel Pieras es un programador español que ha construido tres negocios de software escalando su MRR (Monthly Recurring Revenue) hasta superar los $100.000 mensuales. En esta entrevista detalla su metodología: partir de necesidades propias reales, validar rápidamente con MVPs mínimos, y aprovechar la inteligencia artificial para acelerar el desarrollo y la distribución de contenidos. Contrastando modelos B2C (Hassle Gotrire, dropshipping) y B2B (Cloud Browser, Autocent API), explica cómo el conocimiento técnico sigue siendo diferenciador a pesar de la democratización de la programación con IA, y comparte tácticas concretas de adquisición de primeros clientes, gestión de equipos, y visión de futuro hacia agentes autónomos.

---

## Fase 1: Filosofía de Identificación de Ideas — "Resolver tus propios problemas"

### Qué se explica
Miguel describe su criterio principal para decidir qué construir: **las necesidades propias que surge en su operativa diaria**. No parte de ideas abstractas del mercado, sino de fricciones concretas que experimenta como operador.

### Por qué es importante
- Elimina la incertidumbre sobre si el problema existe realmente
- Permite validar la solución de forma inmediata (eres tu primer usuario)
- Facilita priorizar funcionalidades con criterio de usuario, no de especulación

### Pasos concretos mencionados
1. **Detectar la fricción**: Al operar dropshipping, identificó que un competidor le copió el listing de un producto bestseller y le ganó por una libra de diferencia
2. **Buscar soluciones existentes**: Revisar si ya hay herramientas en el mercado que resuelvan el problema exacto
3. **Construir solo si no existe**: Al no encontrar lo necesario, desarrolló su propia solución (sistema de detección de copias + guerra de precios automatizada)
4. **Evaluar escalabilidad**: Determinar si la solución podría servir a otros con el mismo problema

### Errores, riesgos y dependencias
- **Riesgo de "querer hacer todo"**: Con las herramientas actuales es tan fácil añadir funcionalidades que se puede perder el foco en lo que realmente necesita el cliente
- **Dependencia del feedback real**: Requiere estar operativamente activo en el nicho para detectar problemas genuinos
- **Pendiente de validar**: No queda claro si Miguel tiene un proceso sistemático para decir "no" a ideas propias, o si es puramente intuitivo

---

## Fase 2: Evolución de los Tres SaaS — De la necesidad al producto

### Qué se explica
Miguel detalla sus tres productos, cada uno originado en un contexto operativo diferente, con modelos de negocio y clientes distintos.

| SaaS | Origen | Modelo | Clientes principales |
|------|--------|--------|----------------------|
| **Hassle Gotrire** | Automatización de dropshipping propio | B2C (e-commerce sellers) | Reino Unido, USA, Alemania, Turquía |
| **Cloud Browser** | Necesidad de automatizaciones con navegador | B2B + uso interno | Empresas con scrapers, compras automatizadas en Amazon, etc. |
| **Autocent API** | Potenciar Notebook LM de Google para automatizaciones | B2B (enterprise) | Empresas generando 1000+ podcasts/día, decks personalizados, onboarding |

### Por qué es importante
Demuestra que un mismo fundador puede operar simultáneamente en espectros muy distintos (B2C masivo vs. B2B enterprise), siempre que la base técnica sea sólida y la distribución esté adaptada a cada segmento.

### Pasos concretos mencionados
- **Cloud Browser**: Desplegar navegadores en la nube para tareas automáticas que requieren interacción web (ej: comprar en diferentes proveedores, Amazon)
- **Autocent API**:
  - Crear API sobre Notebook LM cuando aún era muy novedoso (hace ~2 años)
  - Inicialmente: pago → email con API key → sin plataforma, solo API documentada
  - Evolución a generación de: podcasts Spotify, vídeos de onboarding, infografías, presentaciones, shorts con avatares, todo con branding personalizado

### Errores, riesgos y dependencias
- **Dependencia de plataformas externas**: Autocent API se construye sobre Notebook LM de Google; cambios en la plataforma base pueden afectar el servicio
- **Diferencia de soporte B2C vs. B2B**:
  - B2C (Hassle Gotrire): más tickets, más guía, más frustración por expectativas irreales (ej: "niño de 15 años con Ferrari prometiendo €15.000/mes")
  - B2B: ticket más alto, menos intervención si el producto funciona, casi silencio mensual
- **Riesgo de expectativas distorsionadas**: En B2C, muchos usuarios abandonan al primer mes si no ven resultados inmediatos

---

## Fase 3: Construcción Técnica — De programador manual a "orquestador de IA"

### Qué se explica
La evolución personal de Miguel como desarrollador, desde programar "a mano" en .NET hasta utilizar herramientas de IA como **Cloud Code**, **Codex**, **Cursor**, llegando a no abrir el editor hasta la pull request.

### Por qué es importante
Ilustra la transición que los desarrolladores experimentados están haciendo: de escritores de código a directores técnicos que guían, revisan y validan el trabajo de agentes de IA.

### Pasos concretos mencionados
1. **Primera etapa (dropshipping)**: Aplicación de consola en .NET que corrió en su casa, integrando proveedores y eBay/Amazon
2. **Extensión de Chrome**: Para copiar productos de proveedores con un botón
3. **Transición a IA**:
   - Uso inicial de Cursor (más manual)
   - Migración a Cloud Code, Codex
   - **Flujo actual**: trabaja en terminal con Cloud Code, no abre el editor hasta ver la pull request
4. **Herramienta personal**: Desarrolló su propio IDE simplificado (open source) para gestionar múltiples instancias de Cloud Code organizadas, ya que no encontraba una interfaz que se adaptara a su flujo de "múltiples agentes trabajando en paralelo"

### Errores, riesgos y dependencias
- **Riesgo de desconexión del código**: Miguel reconoce que a veces prefiere decirle a la IA "quita esto" en lugar de borrar una línea él mismo
- **Dependencia de la calidad del prompt**: El conocimiento técnico previo sigue siendo crucial para "marcar la estructura" y saber qué puede ser problema
- **Riesgo para no-técnicos**: Una persona sin base de programación puede crear algo sencillo, pero para proyectos serios "se le puede ir de las manos" sin entender bases de datos, arquitectura, etc.
- **Pendiente de validar**: El nombre exacto de su IDE personal no se menciona claramente ("la app de code" parece ser una referencia genérica, no el nombre)

---

## Fase 4: Adquisición de Primeros Clientes — De 0 a tracción

### Qué se explica
Cómo Miguel pasó de usar sus herramientas en privado a conseguir usuarios pagos, con tácticas específicas para el contexto de 2018-2019.

### Por qué es importante
Muchos desarrolladores construyen excelentes productos pero fracasan en la distribución. Miguel demuestra que los primeros clientes requieren esfuerzo no escalable deliberado.

### Pasos concretos mencionados
1. **Grupos de Facebook**: Participación activa en comunidades de dropshipping y venta online; responder cuando alguien pedía recomendación de software
2. **Chat en vivo en la web**:
   - Instaló chat en vivo cuando era él solo respondiendo
   - Respondía en segundos, a cualquier hora
   - Si pedían una funcionalidad, a veces la implementaba y enviaba email el mismo día: "ya está hecho"
3. **Cercanía como ventaja competitiva**: Competidores grandes con 200+ clientes no podían ofrecer ese nivel de servicio personalizado

### Errores, riesgos y dependencias
- **No escalable**: El chat 24/7 personal no funciona con crecimiento; es una táctica de fase temprana exclusivamente
- **Dependencia de la presencia del fundador**: Requiere disponibilidad extrema que no todos pueden asumir
- **Riesgo de quemarse**: Miguel no menciona cuánto tiempo duró esta fase, pero implica sacrificio personal significativo

---

## Fase 5: Evolución del Equipo — De solo a equipo y vuelta al "solo optimizado"

### Qué se explica
La trayectoria de Miguel en la gestión de personas: de querer montar equipo por ilusión, a tenerlo, a preferir proyectos que pueda manejar solo o con equipo mínimo.

### Por qué es importante
Desafía la narrativa de que "escalar = contratar más gente". Con las herramientas actuales, un solo desarrollador puede tener impacto desproporcionado.

### Pasos concretos mencionados
1. **2019**: Dejó su trabajo en Londres, volvió a Palma, montó empresa con equipo
2. **Actualidad (Hassle Gotrire)**: 2 personas empleadas formalmente
3. **Autocent API**: Lo hace solo, sin equipo
4. **Red de colaboradores**: Mantiene contacto con "máquinas" (desarrolladores top) para consultas específicas o tareas puntuales, sin que sean empleados
5. **Filosofía de contratación (Steve Jobs)**: "Rodearte de gente buena, que te digan ellos lo que tienen que hacer, no tú a ellos"

### Errores, riesgos y dependencias
- **Cambio de gestión técnica a gestión de personas**: Miguel describe este salto como "muy grande" y que requiere habilidades distintas
- **Riesgo de aislamiento**: Reconoce que algunas personas necesitan cofundador para momentos difíciles; él parece funcionar bien solo
- **Dependencia de la IA para mantenerse solo**: Su preferencia actual por trabajar solo está directamente ligada a las capacidades de Cloud Code, Codex, etc.

---

## Fase 6: El Futuro — Agentes Autónomos y Personalización Masiva

### Qué se explica
La hoja de ruta de cada producto, con énfasis en la transición de herramientas pasivas a **agentes proactivos** que actúan con mínima intervención humana.

### Por qué es importante
Anticipa dónde está el valor diferencial del software en la era de la IA: no en generar contenido, sino en **orquestar acciones autónomas personalizadas**.

### Pasos concretos mencionados
- **Hassle Gotrire**: Agente que gestione tiendas por WhatsApp (TikTok, Shopify, Wallapop, eBay, Amazon), siendo proactivo: "he visto que esto no vende, cambié el precio, busqué otro proveedor"
- **Cloud Browser**: "Skills" para agentes de IA que naveguen web y escritorios virtuales de forma autónoma
- **Autocent API**:
  - Continuar adopción B2B enterprise
  - Añadir capa de branding corporativo sobre todo lo generado
  - Shorts con avatares personalizados a partir de documentos
  - Ejemplo concreto: web en 4-5 idiomas + cursos de formación completos generados con IA en turco, con infografías y presentaciones

### Errores, riesgos y dependencias
- **Dependencia tecnológica masiva**: Todo el futuro descanso en la evolución de modelos de IA (locales y en la nube)
- **Riesgo regulatorio/privacidad**: Agentes autónomos gestionando tiendas reales implican acceso a datos sensibles y transacciones financieras
- **Pendiente de validar**: No se mencionan timelines específicos ni inversión requerida para estos desarrollos

---

## Procedimiento Paso a Paso

Basado en la experiencia de Miguel, aquí el proceso replicable para construir SaaS desde necesidades propias:

| Paso | Acción | Detalle |
|------|--------|---------|
| 1 | **Operar en un nicho** | Trabajar activamente en un área (dropshipping, marketing, etc.) para detectar fricciones reales |
| 2 | **Documentar la fricción** | Cuándo ocurre, cuánto tiempo consume, cuánto dinero cuesta no resolverla |
| 3 | **Buscar soluciones existentes** | Revisar mercado exhaustivamente; solo construir si no hay match exacto |
| 4 | **Construir para uno mismo** | MVP mínimo que resuelva tu caso específico; no pensar en producto todavía |
| 5 | **Validar uso propio** | Usarlo diariamente; iterar hasta que te ahorre tiempo significativo |
| 6 | **Evaluar si otros tienen el mismo problema** | Conversaciones informales, grupos de comunidad, observación de comportamiento |
| 7 | **Preparar versión "para otros"** | Simplificar onboarding, añadir autenticación básica, documentar API mínima |
| 8 | **Lanzar con distribución no escalable** | Grupos de Facebook, chat en vivo personal, responder en foros donde ya están tus usuarios |
| 9 | **Iterar con feedback real** | Implementar peticiones rápidas (mismo día si es posible) para generar wow |
| 10 | **Decidir modelo: solo o equipo** | Evaluar si la IA permite mantenerlo solo; si no, contratar por habilidad específica en herramientas de IA |
| 11 | **Escalar distribución** | Una vez validado, pasar a canales más escalables (SEO, contenido, partnerships) |

---

## Puntos Críticos a Recordar

> **"Si tú tienes una necesidad y te haces algo que te la resuelve, seguramente esa necesidad la tiene más gente"**
> — Miguel Pieras

- **El conocimiento técnico sigue siendo diferenciador**: A pesar de que "cualquiera puede crear software", saber qué decirle a la IA, cómo estructurar, y qué puede fallar requiere base de programación
- **La distribución es más difícil que la construcción**: Especialmente en B2C; en B2B, si el producto funciona, el soporte es mínimo
- **El MVP puede ser extremadamente mínimo**: Autocent API empezó como "pagas → te envío API key por email → sin plataforma"
- **La IA reduce costos de oportunidad**: Permite probar en un fin de semana lo que antes llevaba meses, facilitando el descarte rápido
- **El "solo fundador" es viable de nuevo**: Gracias a Cloud Code, Codex, etc.; pero requiere autoconocimiento (¿funcionas bien solo en crisis?)
- **Cuidado con las expectativas B2C**: Usuarios atraídos por promesas de "dinero fácil" generan churn y frustración
- **Construir herramientas internas vs. comprar SaaS**: Evaluar siempre "esfuerzo de replicar vs. beneficio de ahorrar"; algunos SaaS (Stripe, analytics avanzados) siguen siendo irremplazables

---

## Conclusión

Miguel Pieras representa el arquetipo del desarrollador-empresario que ha atravesado tres eras: la de programar todo manualmente, la de construir con equipo tradicional, y la actual de **"orquestador de IA"** que puede manejar múltiples productos con mínima estructura organizativa. Su trayectoria demuestra que los principios fundamentales no han cambiado —resolver problemas reales, estar cerca del cliente, validar rápido— pero las herramientas han reducido drásticamente la fricción técnica, permitiendo que un individuo con criterio técnico y sentido de distribución pueda construir negocios de seis cifras mensuales.

La lección más valiosa es quizás la **inversión en distribución desde el día uno**: no basta con construir bien, hay que estar físicamente donde están los clientes potenciales, con un nivel de servicio que los grandes competidores no pueden replicar. En un mundo donde la construcción se democratiza, la cercanía, la velocidad de respuesta y la personalización se convierten en las barreras de entrada más sólidas.

El horizonte que dibuja —agentes autónomos gestionando negocios completos vía WhatsApp— sugiere que estamos en una transición de "software como herramienta" a "software como empleado", donde el valor migrará de la funcionalidad a la **autonomía y proactividad**. Para los fundadores técnicos actuales, la pregunta ya no es "¿puedo construir esto?", sino "¿puedo construir algo que actúe por sí mismo?".