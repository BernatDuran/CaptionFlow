# Análisis de mejoras potenciales para CaptionFlow

Fecha de revisión: 2026-05-24

Este documento recoge mejoras detectadas tras revisar la estructura actual de CaptionFlow: frontend React/Vite, backend Express, servicios de prompts, configuración, extracción con `yt-dlp`, generación IA, diagramas, métricas, PDF e historial.

No se han modificado archivos de código para este análisis.

## 1. Funcionalidad de la APP

### Estado actual

CaptionFlow ya cubre el flujo principal de forma bastante completa:

- Permite pegar una URL de YouTube, seleccionar un prompt y generar un documento Markdown.
- Carga prompts Markdown desde `/prompts` y prompts de diagramas desde `/prompts/diagrams`.
- Usa `yt-dlp` en backend para obtener metadatos y subtítulos oficiales o automáticos.
- Conserva transcripciones canónicas por vídeo, idioma y fuente en `output/transcripts/by-video`.
- Procesa con OpenAI, Google Gemini o Nano-GPT mediante una capa de proveedores separada.
- Tiene selección de proveedor/modelo desde configuración sin exponer API keys al frontend.
- Implementa chunking básico/semántico para transcripciones largas.
- Guarda resultados Markdown, metadatos `.meta.json`, métricas de tokens/tiempos y diagramas Mermaid.
- Permite vista previa, copia, descarga Markdown, PDF y generación de diagramas.
- Incluye historial con filtros por canal, texto y mes.
- Registra runs de IA y operaciones relevantes, incluyendo tokens y duración cuando el proveedor los reporta.

### Mejoras recomendadas sobre funcionalidad existente

#### 1. Hacer la transcripción una entidad visible de primer nivel

Ahora la app ya evita parte de la redundancia guardando transcripciones canónicas por vídeo, pero el usuario no ve claramente que una transcripción ya existe.

Mejora propuesta:

- Mostrar un aviso discreto cuando una URL ya tiene transcripción cacheada.
- Permitir elegir entre usar la transcripción existente o refrescarla.
- Añadir una vista "Transcripciones" o una sección dentro del historial agrupada por vídeo.
- Mostrar idioma, fuente, fecha, duración, canal y hash de transcripción.
- Permitir generar nuevos documentos desde una transcripción existente sin volver a llamar a `yt-dlp`.

Impacto:

- Reduce espera percibida.
- Evita confusión cuando el mismo vídeo se procesa con prompts distintos.
- Hace más transparente qué parte consume IA y qué parte solo descarga texto.

#### 2. Agrupar resultados por vídeo

Actualmente cada procesamiento genera un resultado independiente. Esto es correcto técnicamente, pero en el historial puede crecer rápido.

Mejora propuesta:

- Agrupar por vídeo/canal/título.
- Dentro de cada vídeo, listar documentos generados por prompt, provider, modelo y fecha.
- Mostrar diagramas asociados debajo de cada documento.

Ejemplo de agrupación:

- Vídeo A
  - Paso a paso profundo · OpenAI · gpt-x · 23 may
  - Resumen ejecutivo · Gemini · gemini-x · 23 may
  - Lista de acciones · Nano-GPT · modelo-x · 24 may

Impacto:

- El historial pasa de ser una lista de archivos a una biblioteca más comprensible.

#### 3. Añadir acciones de gestión sobre documentos

Ahora se puede ver, descargar y generar derivados, pero falta gestión básica.

Mejoras útiles:

- Renombrar título visible del documento.
- Añadir favoritos.
- Archivar u ocultar documentos antiguos.
- Eliminar resultado, PDF, diagramas y metadatos asociados con confirmación.
- Descargar paquete ZIP con Markdown, PDF, transcripción, metadatos y diagramas.

Impacto:

- Mejora mucho el uso real cuando se acumulen decenas o cientos de documentos.

#### 4. Mejorar el flujo de prompts personalizados

La app permite editar/usar prompt personalizado, lo cual es potente. Falta convertirlo en una experiencia más controlada.

Mejora propuesta:

- Diferenciar claramente entre:
  - usar prompt base sin cambios;
  - editar temporalmente para esta ejecución;
  - guardar como nuevo prompt;
  - sobrescribir prompt existente.
- Guardar versión del prompt usada en el `.meta.json`.
- Mostrar en historial si el resultado usó prompt original o prompt personalizado.
- Permitir comparar el prompt base y el prompt modificado.

Impacto:

- Evita perder trazabilidad sobre por qué dos resultados con el mismo prompt dieron salidas distintas.

#### 5. Versionado real de diagramas

Actualmente se guarda el último `.mmd` por tipo de diagrama y se conserva histórico de métricas. Es suficiente para V1, pero limitado.

Mejora propuesta:

- Guardar cada generación/regeneración de diagrama como versión independiente.
- Mantener un puntero `latest` para la versión visible por defecto.
- Permitir abrir versiones anteriores.
- Mostrar provider, modelo, duración, tokens y fecha de cada versión.

Impacto:

- Hace coherente la trazabilidad: si las métricas conservan histórico, los artefactos también deberían poder conservarlo.

#### 6. Mejorar el tratamiento de transcripciones largas

La app ya divide y resume por chunks, incluso con cierto enfoque semántico. Aun así, el dimensionamiento puede mejorar.

Mejora propuesta:

- Hacer chunking token-aware por provider/modelo.
- Ajustar tamaño de chunk según ventana de contexto real.
- Reservar presupuesto para instrucciones, metadatos y respuesta.
- Registrar en metadata:
  - número de chunks;
  - tamaño medio;
  - tokens por chunk;
  - duración por chunk;
  - modelo usado en cada chunk.
- Permitir modo "rápido" y modo "máxima fidelidad".

Impacto:

- Menos errores por límite de contexto.
- Mejor control de coste y duración.
- Resultados más consistentes entre modelos.

#### 7. Añadir cancelación y reintento de trabajos

El proceso puede tardar bastante y actualmente el usuario espera hasta terminar o fallar.

Mejora propuesta:

- Botón "Cancelar" durante un procesamiento.
- Reintentar solo el paso fallido:
  - subtítulos;
  - generación IA;
  - PDF;
  - diagrama.
- Guardar estado parcial para no repetir pasos completados.

Impacto:

- Reduce frustración en vídeos largos o proveedores inestables.

#### 8. Persistir jobs más allá de memoria

Los jobs de `/api/process` viven en memoria. Si se reinicia la app, se pierde el estado del trabajo.

Mejora propuesta:

- Guardar estado del job en `output/jobs`.
- Recuperar jobs recientes al reiniciar.
- Marcar jobs interrumpidos como "cancelados por reinicio".

Impacto:

- Mayor robustez sin necesidad de introducir base de datos.

#### 9. Añadir preflight de proveedor/modelo

El usuario puede seleccionar un provider/modelo que aparentemente está disponible, pero fallar después por API key, endpoint, permisos o modelo incompatible.

Mejora propuesta:

- Botón "Probar conexión" en configuración.
- Validar:
  - API key presente;
  - endpoint responde;
  - modelo usable para generación de texto;
  - usage/tokens disponibles o no.
- Mostrar último estado de salud del proveedor.

Impacto:

- Reduce errores tardíos al procesar vídeos.

#### 10. Mejorar el modo PDF

El PDF ya existe, pero es un área sensible porque Markdown complejo puede renderizar mal.

Mejora propuesta:

- Renderizar Markdown a un AST en vez de resolver casos con reglas sueltas.
- Soportar mejor:
  - encabezados sin espacio;
  - listas anidadas;
  - tablas;
  - bloques de código;
  - enlaces;
  - saltos de página.
- Añadir tema PDF configurable:
  - compacto;
  - lectura;
  - informe profesional.

Impacto:

- Menos casos visuales raros como encabezados `####` que aparecen como texto.

#### 11. Añadir modo "varios outputs desde un mismo vídeo"

Flujo útil:

- Usuario pega un vídeo.
- Selecciona varios prompts.
- La app obtiene una sola transcripción.
- Genera varios documentos.

Impacto:

- Ahorra tiempo.
- Encaja muy bien con la reutilización de transcripciones.

#### 12. Añadir modo "solo transcribir"

Mejora propuesta:

- Opción para guardar/ver únicamente la transcripción sin llamar a IA.
- Útil para comprobar subtítulos antes de consumir tokens.

Impacto:

- Da control al usuario y evita costes innecesarios.

#### 13. Añadir analítica funcional

Con las métricas ya implementadas, se puede crear una vista de análisis:

- Tiempo medio por provider/modelo.
- Tokens medios por tipo de prompt.
- Coste estimado si se añade catálogo de precios.
- Errores por provider/modelo.
- Chunks medios por duración de vídeo.

Impacto:

- Convierte CaptionFlow en una herramienta medible y optimizable.

### Nuevas funcionalidades potencialmente útiles

- Procesamiento por lotes de varias URLs.
- Soporte de playlists de YouTube.
- Importar transcripción manual cuando YouTube no tenga subtítulos.
- Selección de idioma de salida independiente del idioma original.
- Generar índice, tabla de contenidos o resumen ejecutivo automático sobre documentos largos.
- Comparar dos resultados generados con prompts/modelos distintos.
- Exportar todo el historial a CSV/JSON.
- Añadir etiquetas manuales a documentos.
- Plantillas de salida por caso de uso: formación, ventas, research, reuniones, tutoriales.
- Detección automática del tipo de vídeo para recomendar prompt.
- Notificación visual o sonora al terminar procesos largos.

## 2. Diseño de la APP y UX/UI

### Estado actual

La UI cumple la intención original:

- Pantalla principal sencilla.
- Campo de URL, selector de prompt y botón de procesar.
- Configuración separada en modal.
- Resultado en modal legible.
- Historial visible.
- Acciones agrupadas en menú.
- Diagramas en modal flotante con zoom, descarga y desplazamiento.

La app se siente funcional y directa, pero ya tiene más capacidades que la pantalla inicial. El principal riesgo UX ahora no es falta de funciones, sino acumulación de opciones en espacios pequeños.

### Mejoras recomendadas de UX

#### 1. Separar mejor "crear" y "consultar"

Ahora la pantalla principal combina creación, estado e historial. A medida que crece el historial, puede sentirse densa.

Mejora propuesta:

- Mantener arriba una zona compacta de creación.
- Convertir el historial en una biblioteca con vista propia o panel más estructurado.
- Ofrecer dos modos:
  - "Nuevo documento";
  - "Historial".

Impacto:

- Mantiene baja fricción para crear.
- Evita que el historial robe protagonismo cuando haya muchos registros.

#### 2. Hacer el progreso más informativo

Los estados actuales son útiles, pero podrían ser más específicos y medibles.

Mejora propuesta:

- Mostrar pasos con estado:
  - validando URL;
  - obteniendo metadatos;
  - buscando subtítulos;
  - usando transcripción cacheada;
  - dividiendo en chunks;
  - enviando a IA;
  - generando documento;
  - guardando resultado.
- Mostrar tiempo transcurrido.
- Indicar cache hit cuando no se descarga de nuevo la transcripción.

Impacto:

- Reduce sensación de espera ciega.
- Ayuda al usuario a entender si el tiempo se va en YouTube, IA o generación final.

#### 3. Sustituir `confirm()` por modales propios

Cuando se detectan límites desconocidos, el frontend usa confirmación nativa del navegador.

Mejora propuesta:

- Crear un modal propio con tono visual consistente.
- Explicar el riesgo:
  - el modelo no informa límite fiable;
  - puede fallar por contexto;
  - se puede continuar bajo responsabilidad del usuario.

Impacto:

- Más profesional y menos brusco.

#### 4. Mejorar la configuración de modelos

El selector buscable es una buena base.

Mejoras útiles:

- Mostrar chips de metadata por modelo:
  - recomendado;
  - contexto alto;
  - económico;
  - rápido;
  - experimental.
- Mostrar último modelo usado.
- Marcar modelos no verificados.
- Añadir "Probar modelo".
- Mostrar límites conocidos si existen.

Impacto:

- Ayuda a usuarios no técnicos a elegir sin entender nombres crípticos.

#### 5. Historial más compacto pero más potente

Ya se compactó parcialmente, pero todavía puede evolucionar.

Mejora propuesta:

- Filtros en una barra única:
  - buscador;
  - canal;
  - prompt;
  - provider;
  - modelo;
  - mes;
  - tiene diagramas;
  - favoritos.
- Alternar vista lista y vista tabla.
- Mostrar métricas en una segunda línea colapsable o en tooltip.
- Acciones frecuentes visibles y acciones secundarias en menú.

Impacto:

- Mejor navegación en historiales grandes.

#### 6. Resultado Markdown con navegación interna

Los resultados pueden ser largos.

Mejora propuesta:

- Añadir tabla de contenidos generada desde encabezados.
- Buscador dentro del resultado.
- Botón para copiar sección.
- Metadata colapsable para no ocupar espacio.
- Mantener acciones sticky arriba.

Impacto:

- Leer y reutilizar documentos largos será más cómodo.

#### 7. Diagramas: mejorar herramientas de exploración

El modal de diagramas ya mejoró con zoom y arrastre. Aun así, puede ganar precisión.

Mejoras útiles:

- Botón "Ajustar a pantalla".
- Botón "Centrar".
- Botón "100% real" separado del "encajar".
- Mini indicador de escala.
- Opción de ver código Mermaid.
- Mensaje de error que permita copiar el Mermaid fallido.
- Historial de versiones de diagrama.

Impacto:

- Reduce frustración cuando Mermaid genera diagramas muy anchos o profundos.

#### 8. Feedback visual para acciones largas

Ya se añadieron avisos para PDF/diagrama/Markdown, pero conviene estandarizarlo.

Mejora propuesta:

- Sistema único de toasts o estados inline.
- Cada acción debería tener:
  - estado pendiente;
  - éxito;
  - error accionable;
  - duración si aplica.

Impacto:

- La app se siente más fiable.

#### 9. Accesibilidad

Hay modales, dropdowns y paneles flotantes. Conviene reforzar accesibilidad.

Mejoras:

- Focus trap real en modales.
- Cierre con Escape consistente.
- Navegación completa por teclado en menús.
- Roles ARIA en combobox, menu, dialog y listbox.
- Estados `aria-busy` en procesos.
- Contraste revisado en chips y textos secundarios.

Impacto:

- Mejora uso profesional y reduce fallos en interacciones complejas.

#### 10. Responsive/mobile

La app parece pensada principalmente para escritorio.

Mejora propuesta:

- Revisar modales en móvil.
- Convertir acciones en bottom sheet en pantallas pequeñas.
- Hacer filtros del historial colapsables.
- Evitar dropdowns secundarios demasiado anchos.
- Ajustar modal de diagrama para pantallas estrechas.

Impacto:

- Mejor experiencia en portátiles pequeños y tablets.

#### 11. Consistencia visual y de idioma

Se observan textos con problemas de codificación en algunos componentes, por ejemplo caracteres acentuados renderizados incorrectamente.

Mejora propuesta:

- Normalizar todos los archivos a UTF-8.
- Revisar textos visibles.
- Crear un pequeño diccionario de mensajes de UI.
- Evitar mezclar "AI" e "IA" salvo que sea intencional.

Impacto:

- Mejora percepción de calidad inmediatamente.

## 3. Parte técnica

### Estado actual

La arquitectura es razonable para una V1/V1.1 local:

- Frontend y backend separados dentro del mismo proyecto.
- Servicios backend por dominio:
  - IA;
  - YouTube;
  - prompts;
  - configuración;
  - archivos;
  - procesamiento;
  - PDF;
  - diagramas.
- No hay base de datos, lo cual encaja con el objetivo de baja fricción.
- Las API keys no se exponen al frontend.
- Se usa `spawn`/argumentos seguros para `yt-dlp`.
- Los outputs sensibles están pensados para quedar fuera de control de versiones.
- Hay tests para normalización de usage y agregación de totales.

### Mejoras técnicas recomendadas

#### 1. Introducir validación de esquemas

Actualmente hay validación manual en varios puntos.

Mejora propuesta:

- Usar Zod, Valibot o similar para:
  - body de `/api/process`;
  - body de `/api/settings`;
  - creación de prompts;
  - frontmatter de prompts;
  - metadata `.meta.json`;
  - respuestas de proveedores.

Impacto:

- Reduce errores silenciosos.
- Facilita migraciones.
- Mejora mensajes al usuario.

#### 2. Añadir versión de esquema a metadatos

Los `.meta.json` han ido creciendo con nuevas capacidades.

Mejora propuesta:

- Añadir `schemaVersion`.
- Crear función de migración interna.
- Mantener compatibilidad con documentos antiguos.

Impacto:

- Evita lógica dispersa para metadata parcial.

#### 3. Centralizar la gestión de runs y métricas

La lógica de runs está funcionando, pero puede convertirse en un servicio propio.

Mejora propuesta:

- Crear un `runMetricsService`.
- Responsabilidades:
  - crear run;
  - cerrar run;
  - normalizar tokens;
  - recalcular totales;
  - añadir a metadata;
  - consultar último run por tipo.

Impacto:

- Menos duplicación entre procesamiento, diagramas y futuras operaciones.

#### 4. Mejorar el índice del historial

`/api/history` lee archivos y metadatos del sistema de ficheros. Para poco volumen está bien, pero puede escalar mal.

Mejora propuesta:

- Mantener un índice local `output/index/results.json`.
- Actualizarlo al crear/modificar/eliminar resultados.
- Soportar paginación.
- Aplicar filtros en backend.

Impacto:

- Mejor rendimiento con muchos resultados.
- Menos trabajo en cada carga.

#### 5. Robustecer `yt-dlp`

Áreas concretas:

- Asegurar limpieza de temporales con `finally`.
- Añadir timeout al proceso hijo.
- Guardar stderr útil sin exponer rutas sensibles.
- Mejorar detección de `yt-dlp` no instalado.
- Permitir refrescar binario o mostrar versión.
- Revisar de-duplicado global de líneas, porque puede eliminar repeticiones legítimas del discurso.

Impacto:

- Menos fallos difíciles de diagnosticar.
- Transcripciones más fieles.

#### 6. Preservar segmentos/timestamps de subtítulos

La app convierte subtítulos a texto plano. Eso es suficiente para resúmenes, pero limita futuras funciones.

Mejora propuesta:

- Guardar una versión estructurada:
  - timestamp inicio;
  - timestamp fin;
  - texto;
  - idioma;
  - fuente.
- Mantener también el texto plano para IA.

Impacto:

- Permite citas con tiempo.
- Permite navegación por secciones.
- Permite generar capítulos.

#### 7. Mejorar estimación y límites de tokens

La app ya usa límites de modelo, pero todavía hay comprobaciones basadas en caracteres.

Mejora propuesta:

- Usar tokenizadores o estimadores por familia:
  - OpenAI: tokenizer compatible;
  - Gemini: endpoint de conteo si aplica;
  - Nano-GPT: fallback por catálogo/modelo.
- Reservar presupuesto para:
  - prompt del sistema;
  - metadatos;
  - transcripción;
  - respuesta esperada.
- Registrar el presupuesto calculado antes de enviar.

Impacto:

- Menos errores por contexto.
- Chunking más eficiente.

#### 8. Unificar robustez de proveedores IA

Nano-GPT ya tiene timeout y retry más explícitos. OpenAI y Gemini podrían beneficiarse del mismo patrón.

Mejora propuesta:

- Crear wrapper común:
  - timeout;
  - retry con backoff;
  - clasificación de error;
  - parseo seguro;
  - medición de duración;
  - redacción de mensajes sin secretos.

Impacto:

- Menos diferencias inesperadas entre providers.
- Mejor diagnóstico de `fetch failed`, 429 o timeouts.

#### 9. Mejorar diagnóstico de respuestas vacías

OpenAI ya tiene extracción más robusta, pero conviene guardar diagnóstico seguro.

Mejora propuesta:

- Cuando la IA devuelva texto vacío:
  - guardar provider/model/status;
  - guardar tipos de output recibidos;
  - guardar usage si existe;
  - no guardar prompt completo salvo que el usuario lo permita.

Impacto:

- Facilita entender si fue refusal, incomplete, formato raro o error de proveedor.

#### 10. Controlar concurrencia por provider

El chunking paralelo acelera, pero puede chocar con rate limits.

Mejora propuesta:

- Configurar concurrencia por provider/modelo en `.env` o settings locales.
- Backoff especial para 429.
- Reducir automáticamente concurrencia si hay errores repetidos.

Impacto:

- Mejor equilibrio entre velocidad y fiabilidad.

#### 11. Persistencia de jobs y cancelación real

Para cancelar de verdad no basta con ocultar UI.

Mejora propuesta:

- Usar `AbortController` para llamadas fetch a providers.
- Poder matar proceso `yt-dlp`.
- Guardar estado de job en disco.
- Diseñar estados:
  - queued;
  - running;
  - canceling;
  - canceled;
  - failed;
  - completed.

Impacto:

- Base más sólida para procesos largos.

#### 12. Mejorar seguridad local

La app está pensada para local, pero aun así conviene cerrar bordes.

Mejoras:

- Restringir CORS a origen local configurado.
- Validar estrictamente nombres de archivo en endpoints de descarga.
- Evitar que prompts creados desde UI puedan escribir fuera de `/prompts`.
- Revisar límites de tamaño de JSON para prompts custom.
- Añadir rate limit local básico para endpoints costosos.
- No incluir `rawUsage` excesivamente grande o sensible si no es necesario.

Impacto:

- Reduce riesgo si la app queda expuesta accidentalmente en red local.

#### 13. Separar tipos compartidos

Hay tipos repetidos o inferidos entre frontend y backend.

Mejora propuesta:

- Crear `src/shared/types.ts`.
- Compartir:
  - ProviderId;
  - PromptDefinition;
  - DiagramPromptDefinition;
  - UsageTotals;
  - HistoryItem;
  - ProcessJobStatus;

Impacto:

- Menos divergencias entre API y UI.

#### 14. Tests a ampliar

Tests actuales útiles:

- Normalización de usage.
- Agregación de totales.

Tests recomendados:

- `promptService`:
  - frontmatter válido;
  - frontmatter incompleto;
  - fallback de nombre;
  - ordenación.
- `transcriptService`:
  - URL válida/invalid;
  - selección idioma original;
  - sin subtítulos;
  - caché existente.
- `processingService`:
  - sin chunking;
  - con chunking;
  - error de límite desconocido;
  - custom prompt.
- `diagramService`:
  - limpieza Mermaid;
  - prompt de diagrama inexistente;
  - múltiples regeneraciones.
- API endpoints:
  - proceso feliz con provider fake;
  - descarga segura;
  - historial con metadata parcial.
- UI:
  - selector de modelo;
  - historial filtrado;
  - modal de resultado;
  - menú de acciones;
  - modal de diagramas.

Impacto:

- Permite seguir ampliando sin romper flujos ya ajustados.

#### 15. Reducir deuda de CSS

El CSS central ha crecido bastante.

Mejora propuesta:

- Agrupar por bloques:
  - layout;
  - forms;
  - modals;
  - history;
  - markdown;
  - diagrams;
  - utilities.
- Extraer constantes visuales:
  - colores;
  - radios;
  - sombras;
  - espaciado.
- Revisar duplicados y estilos inline en componentes.

Impacto:

- Facilita mantener la UI sin efectos secundarios.

#### 16. Corregir codificación de archivos

Hay textos con caracteres corruptos en componentes.

Mejora propuesta:

- Normalizar archivos fuente a UTF-8.
- Revisar pipeline/editor.
- Añadir regla o script de comprobación simple para detectar mojibake frecuente.

Impacto:

- Mejora calidad visible y evita errores en mensajes al usuario.

#### 17. Revisar el endpoint de "reiniciar"

El botón actual recarga configuración y `.env`, pero no reinicia realmente el proceso Node.

Mejora propuesta:

- Renombrar a "Recargar configuración" si esa es la intención real.
- O implementar reinicio real de proceso solo si el entorno lo permite.

Impacto:

- Evita una expectativa incorrecta para el usuario.

#### 18. Documentación técnica y operativa

El README cubre la instalación, pero debería evolucionar con la app.

Mejora propuesta:

- Documentar:
  - transcripciones canónicas;
  - metadata `.meta.json`;
  - runs y métricas;
  - prompts custom;
  - prompts de diagramas;
  - funcionamiento del historial;
  - limitaciones de cada provider;
  - resolución de errores comunes.

Impacto:

- Reduce dependencia de recordar decisiones técnicas tomadas durante el desarrollo.

## Prioridades sugeridas

### Prioridad alta

1. Corregir codificación UTF-8 visible en UI.
2. Hacer visible la reutilización de transcripciones cacheadas.
3. Mejorar progreso con tiempos reales por paso.
4. Añadir cancelación/reintento de trabajos largos.
5. Centralizar runs/métricas en un servicio propio.
6. Añadir versionado de metadata.
7. Robustecer `yt-dlp` con cleanup, timeout y mejor diagnóstico.
8. Ampliar tests de flujo principal y servicios críticos.

### Prioridad media

1. Agrupar historial por vídeo.
2. Añadir filtros por provider, modelo, prompt y diagramas.
3. Crear versionado real de diagramas.
4. Mejorar selector de modelos con metadata útil.
5. Añadir preflight de provider/modelo.
6. Implementar índice local para historial.
7. Mejorar PDF mediante renderizado Markdown más estructurado.
8. Añadir tabla de contenidos y búsqueda en resultado Markdown.

### Prioridad baja o futura

1. Procesamiento por lotes.
2. Playlists.
3. Dashboard analítico.
4. Coste estimado por proveedor/modelo.
5. Plantillas PDF.
6. Comparación entre resultados.
7. Exportación ZIP completa.
8. Modo multi-prompt desde una sola transcripción.

## Conclusión

CaptionFlow ya ha superado el estado de prototipo simple: tiene flujo real, proveedores múltiples, métricas, historial, PDF y diagramas. El siguiente salto no debería ser añadir muchas funciones nuevas sin orden, sino consolidar tres ejes:

1. Reutilización clara de transcripciones y agrupación por vídeo.
2. Trazabilidad completa y visible de coste, tokens, tiempo, provider, modelo y versiones.
3. Robustez técnica para procesos largos: cancelación, reintentos, jobs persistentes, validación de esquemas y más tests.

La arquitectura actual permite avanzar sin introducir base de datos todavía. La mejora más importante sería tratar outputs, transcripciones, diagramas, métricas e historial como una biblioteca local coherente, no solo como archivos generados individualmente.
