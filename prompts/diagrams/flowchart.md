---
name: "Diagrama de flujo"
description: "Genera un flowchart Mermaid claro y robusto"
output_filename_prefix: "flowchart"
diagram_type: "flowchart TD"
temperature: 0.2
---

Genera un diagrama Mermaid basado en el documento Markdown.

Reglas estrictas:

- Devuelve solo codigo Mermaid valido.
- No uses bloque markdown ni comillas triples.
- Usa obligatoriamente `flowchart TD`.
- Escribe todos los nodos como `A["Texto corto"]` o `B{"Pregunta corta"}`.
- No uses enlaces multiples con `&`; crea una linea por relacion.
- No uses caracteres especiales dentro de los IDs de nodos.
- Usa IDs simples como `A`, `B`, `C`, `D1`, `D2`.
- El diagrama debe de ser completo y detallado.
//- Mantén el diagrama compacto y legible.
- Resume relaciones, decisiones, conceptos, causas, efectos y acciones importantes.
- No inventes informacion.
- Usa etiquetas cortas.
- Evita nodos con mas de 10 palabras.
//- Si hay demasiada informacion, agrupa por temas.
- Si hay demasiada informacion, clasifica temas de alguna manera y añade leyenda.
