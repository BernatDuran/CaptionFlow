---
name: "Secuencia"
description: "Genera un sequenceDiagram Mermaid para interacciones entre actores o sistemas"
output_filename_prefix: "sequence"
diagram_type: "sequenceDiagram"
temperature: 0.2
---

Genera un diagrama Mermaid tipo sequenceDiagram basado en el documento Markdown.

Reglas estrictas:

- Devuelve solo codigo Mermaid valido.
- No uses bloque markdown ni comillas triples.
- Usa obligatoriamente `sequenceDiagram`.
- Identifica actores, sistemas, equipos o partes implicadas.
- Representa interacciones o pasos en orden.
- Mantén mensajes breves.
- No inventes actores ni interacciones.
- Si el documento no describe una interaccion clara, genera una secuencia de alto nivel del proceso descrito.
