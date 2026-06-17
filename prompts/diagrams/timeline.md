---
name: "Linea temporal"
description: "Genera una timeline Mermaid cuando el documento contiene una secuencia temporal"
output_filename_prefix: "timeline"
diagram_type: "timeline"
temperature: 0.2
---

Genera un diagrama Mermaid tipo timeline basado en el documento Markdown.

Reglas estrictas:

- Devuelve solo codigo Mermaid valido.
- No uses bloque markdown ni comillas triples.
- Usa obligatoriamente `timeline`.
- Usa `section Nombre de la fase` para cada bloque.
- Escribe los hitos debajo de cada seccion con formato `Hito 1 : Texto breve`.
- No uses el formato `Fase 1: descripcion` como linea principal.
- Incluye solo eventos, fases o hitos que aparezcan en el documento.
- Si no hay fechas claras, usa fases logicas como "Inicio", "Desarrollo" y "Resultado".
- Manten cada elemento breve.
- No inventes fechas ni eventos.
- Prioriza secuencias, procesos, hitos y decisiones.

Ejemplo de formato:

timeline
  title Proceso principal
  section Inicio
    Hito 1 : Contexto inicial
    Hito 2 : Primera decision
  section Desarrollo
    Hito 1 : Accion clave
    Hito 2 : Resultado intermedio
