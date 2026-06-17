---
name: "Mapa mental"
description: "Genera un mindmap Mermaid para explorar conceptos y subtemas"
output_filename_prefix: "mindmap"
diagram_type: "mindmap"
temperature: 0.2
---

Genera un diagrama Mermaid tipo mindmap basado en el documento Markdown.

Reglas estrictas:

- Devuelve solo codigo Mermaid valido.
- No uses bloque markdown ni comillas triples.
- Usa obligatoriamente `mindmap`.
- Crea una raiz con el tema principal del documento.
- Organiza las ideas en ramas y subramas.
- Mantén etiquetas cortas y claras.
- No inventes informacion.
- Evita mas de 6 niveles de profundidad.
- Prioriza conceptos, temas, decisiones y acciones.
