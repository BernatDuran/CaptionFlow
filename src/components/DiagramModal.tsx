import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Download, Minus, Plus, X } from "lucide-react";
import { useModalClose } from "./useModalClose";

type DiagramModalProps = {
  title: string;
  mermaidCode: string;
  onClose: () => void;
};

function getDiagramType(code: string) {
  const firstLine = code
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "unknown";
  if (/^(flowchart|graph)\b/i.test(firstLine)) return "flowchart";
  if (/^timeline\b/i.test(firstLine)) return "timeline";
  if (/^mindmap\b/i.test(firstLine)) return "mindmap";
  if (/^sequenceDiagram\b/i.test(firstLine)) return "sequenceDiagram";
  return "unknown";
}

function getBaseScale(input: { type: string; width: number; height: number; availableWidth: number; availableHeight: number }) {
  const fitAll = Math.min(input.availableWidth / input.width, input.availableHeight / input.height);

  if (input.type === "timeline" || input.type === "sequenceDiagram") {
    return Math.min(8, Math.max(0.95, (input.availableHeight / input.height) * 0.92));
  }

  if (input.type === "mindmap") {
    return Math.min(8, Math.max(0.9, Math.min(fitAll * 1.5, (input.availableHeight / input.height) * 1.04)));
  }

  return Math.min(8, Math.max(0.3, fitAll * 0.94));
}

export function DiagramModal({ title, mermaidCode, onClose }: DiagramModalProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);
  const [baseScale, setBaseScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });
  const diagramType = useMemo(() => getDiagramType(mermaidCode), [mermaidCode]);
  const renderId = useMemo(() => `captionflow-diagram-${Date.now()}`, [mermaidCode]);

  const { handleBackdropClick } = useModalClose(onClose);

  useEffect(() => {
    let isMounted = true;

    import("mermaid")
      .then((module) => {
        const mermaid = module.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            fontFamily: "Inter, Segoe UI, sans-serif",
            primaryColor: "#eff6ff",
            primaryBorderColor: "#2563eb",
            primaryTextColor: "#111827",
            lineColor: "#475569"
          }
        });
        return mermaid.render(renderId, mermaidCode);
      })
      .then((result) => {
        if (!isMounted) return;
        setSvg(result.svg);
        setError("");
        setZoom(100);
        setNaturalSize(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("No se pudo renderizar el diagrama generado.");
      });

    return () => {
      isMounted = false;
    };
  }, [renderId, mermaidCode]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const renderedSvg = canvas?.querySelector<SVGSVGElement>("svg");
    if (!canvas || !renderedSvg || !svg) return;

    const viewBox = renderedSvg.getAttribute("viewBox")?.split(/\s+/).map(Number);
    const bbox = typeof renderedSvg.getBBox === "function" ? renderedSvg.getBBox() : undefined;
    const isTrimmed = renderedSvg.dataset.captionflowTrimmed === "true";
    let width = isTrimmed && viewBox?.[2] ? viewBox[2] : bbox?.width || viewBox?.[2] || Number(renderedSvg.getAttribute("width")) || 900;
    let height = isTrimmed && viewBox?.[3] ? viewBox[3] : bbox?.height || viewBox?.[3] || Number(renderedSvg.getAttribute("height")) || 520;
    if (!width || !height) return;

    if (diagramType !== "flowchart" && !isTrimmed && bbox?.width && bbox?.height) {
      const padding = Math.max(18, Math.min(42, Math.min(bbox.width, bbox.height) * 0.05));
      width = bbox.width + padding * 2;
      height = bbox.height + padding * 2;
      renderedSvg.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
      renderedSvg.removeAttribute("width");
      renderedSvg.removeAttribute("height");
      renderedSvg.dataset.captionflowTrimmed = "true";
      setSvg(renderedSvg.outerHTML);
    }

    const availableWidth = Math.max(canvas.clientWidth - 28, 320);
    const availableHeight = Math.max(canvas.clientHeight - 28, 240);
    setNaturalSize({ width, height });
    setBaseScale(
      getBaseScale({
        type: diagramType,
        width,
        height,
        availableWidth,
        availableHeight
      })
    );
  }, [diagramType, svg]);

  function updateZoom(next: number) {
    setZoom(Math.min(200, Math.max(30, next)));
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase()}-diagram.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.button !== 0 || target.closest(".diagram-controls")) return;

    const stage = stageRef.current;
    if (!stage) return;

    panRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop
    };
    stage.setPointerCapture(event.pointerId);
    setIsPanning(true);
    event.preventDefault();
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    const stage = stageRef.current;
    if (!pan.active || !stage || pan.pointerId !== event.pointerId) return;

    stage.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    stage.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
    event.preventDefault();
  }

  function stopPan(event: PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    const stage = stageRef.current;
    if (!pan.active || pan.pointerId !== event.pointerId) return;

    panRef.current.active = false;
    if (stage?.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
  }

  const displayScale = baseScale * (zoom / 100);
  const displaySize = naturalSize
    ? {
        width: naturalSize.width * displayScale,
        height: naturalSize.height * displayScale
      }
    : null;
  const canvasStyle = displaySize
    ? {
        minWidth: `${Math.ceil(displaySize.width + 16)}px`,
        minHeight: `${Math.ceil(displaySize.height + 16)}px`
      }
    : undefined;
  const diagramStyle = displaySize
    ? {
        width: `${displaySize.width}px`,
        height: `${displaySize.height}px`
      }
    : undefined;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !displaySize) return;

    window.requestAnimationFrame(() => {
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
    });
  }, [displaySize?.height, displaySize?.width]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Diagrama" onClick={handleBackdropClick}>
      <section className="diagram-modal">
        <header className="modal-header">
          <div>
            <h2>Diagrama</h2>
            <p>{title}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar diagrama" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div
          className={`diagram-stage${isPanning ? " is-panning" : ""}`}
          ref={stageRef}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={stopPan}
          onPointerCancel={stopPan}
          onPointerLeave={stopPan}
        >
          <div className="diagram-controls" aria-label="Controles de zoom">
            <button type="button" onClick={() => updateZoom(zoom - 10)} aria-label="Reducir zoom">
              <Minus size={15} />
            </button>
            <span>{zoom}%</span>
            <button type="button" onClick={() => updateZoom(zoom + 10)} aria-label="Aumentar zoom">
              <Plus size={15} />
            </button>
            <button type="button" onClick={downloadSvg} disabled={!svg} aria-label="Descargar SVG">
              <Download size={15} />
            </button>
          </div>

          {error ? (
            <div className="diagram-error">{error}</div>
          ) : (
            <div className="diagram-canvas" ref={canvasRef} style={canvasStyle}>
              <div className="diagram-svg" style={diagramStyle} dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
