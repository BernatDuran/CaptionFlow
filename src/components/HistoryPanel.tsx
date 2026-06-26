import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Eye, GitFork, Search, ExternalLink } from "lucide-react";
import type { DiagramPromptOption, HistoryItem } from "../api/types";
import {
  formatDateShort,
  formatDurationClock,
  formatModelShort,
  formatMonth,
  formatVideoDuration,
  formatWords,
  getMonthKey,
  normalizeSearchText
} from "../utils/formatters";
import { DocumentActions } from "./DocumentActions";

export type { HistoryItem };

type HistoryPanelProps = {
  items: HistoryItem[];
  onOpen: (filename: string) => void;
  onDiagram: (filename: string, promptId: string, mode?: "confirm" | "generate") => void;
  onViewTranscript?: (filename: string) => void;
  diagramPrompts: DiagramPromptOption[];
  isLoading?: boolean;
  diagramFilename?: string;
};

type HistoryFilterOption = {
  value: string;
  label: string;
  count: number;
};

type HistoryFilterComboboxProps = {
  options: HistoryFilterOption[];
  value: string;
  searchPlaceholder: string;
  onChange: (value: string) => void;
};

function TruncatedPromptName({ value }: { value: string }) {
  const textRef = useRef<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const measuredElement = element;

    function updateTruncation() {
      setIsTruncated(measuredElement.scrollWidth > measuredElement.clientWidth + 1);
    }

    updateTruncation();
    const observer = new ResizeObserver(updateTruncation);
    observer.observe(measuredElement);
    window.addEventListener("resize", updateTruncation);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTruncation);
    };
  }, [value]);

  return (
    <span className="history-prompt-name" data-tooltip={isTruncated ? value : undefined}>
      <strong ref={textRef}>{value}</strong>
    </span>
  );
}

function HistoryModelBadge({ value }: { value: string }) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const measuredElement = element;

    function updateTruncation() {
      setIsTruncated(measuredElement.scrollWidth > measuredElement.clientWidth + 1);
    }

    updateTruncation();
    const observer = new ResizeObserver(updateTruncation);
    observer.observe(measuredElement);
    window.addEventListener("resize", updateTruncation);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTruncation);
    };
  }, [value]);

  return (
    <span className="history-doc-chip history-doc-chip-model" data-tooltip={isTruncated ? value : undefined}>
      <span ref={textRef}>{value}</span>
    </span>
  );
}

function HistoryFilterCombobox({ options, value, searchPlaceholder, onChange }: HistoryFilterComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((option) => option.value === value) || options[0];
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim());
    if (!normalizedQuery) return options;
    return options.filter((option) => normalizeSearchText(option.label).includes(normalizedQuery));
  }, [options, query]);

  return (
    <div className="history-filter-combobox" ref={rootRef}>
      <button className="history-filter-trigger" type="button" onClick={() => setIsOpen((current) => !current)}>
        <span>{selected?.label || "Todos"}</span>
        {selected?.value ? <span className="history-filter-count">{(selected.count || 0).toLocaleString("es")}</span> : null}
        <ChevronDown size={15} />
      </button>

      {isOpen ? (
        <div className="history-filter-popover" role="listbox">
          <label className="history-filter-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} autoFocus />
          </label>
          <div className="history-filter-options">
            {filteredOptions.length === 0 ? (
              <div className="history-filter-empty">Sin resultados</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value || "__all__"}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  <span>{option.label}</span>
                  <span className="history-filter-count">{option.count.toLocaleString("es")}</span>
                  {option.value === value ? <Check size={14} /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return formatDateShort(value);
}

function formatModel(model?: string) {
  return formatModelShort(model);
}

function formatDuration(ms?: number) {
  return formatDurationClock(ms);
}

function formatTranscriptWords(value?: number) {
  return formatWords(value);
}

function formatOutputWords(value?: number) {
  if (!value) return "";
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} palabras`;
}

function countBy(items: HistoryItem[], getValue: (item: HistoryItem) => string | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = getValue(item);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function filterHistoryItems(
  items: HistoryItem[],
  filters: {
    channel?: string;
    model?: string;
    month?: string;
    diagram?: string;
    query?: string;
    skip?: "channel" | "model" | "month";
  }
) {
  const normalizedQuery = normalizeSearchText((filters.query || "").trim());

  return items.filter((item) => {
    const itemMonth = getMonthKey(item.processedAt || item.createdAt);
    const matchesChannel = filters.skip === "channel" || !filters.channel || item.channelName === filters.channel;
    const matchesModel = filters.skip === "model" || !filters.model || item.model === filters.model;
    const matchesMonth = filters.skip === "month" || !filters.month || itemMonth === filters.month;
    const matchesDiagram = !filters.diagram || (filters.diagram === "true" ? item.hasDiagram : !item.hasDiagram);
    const searchable = normalizeSearchText(`${item.title} ${item.videoTitle || ""}`);
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    return matchesChannel && matchesModel && matchesMonth && matchesDiagram && matchesQuery;
  });
}

export function HistoryPanel({ items, onOpen, onDiagram, onViewTranscript, diagramPrompts, isLoading, diagramFilename }: HistoryPanelProps) {
  const [channelFilter, setChannelFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [diagramFilter, setDiagramFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(videoId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  const channelOptions = useMemo(() => {
    const facetItems = filterHistoryItems(items, {
      model: modelFilter,
      month: monthFilter,
      diagram: diagramFilter,
      query,
      skip: "channel"
    });
    const counts = countBy(facetItems, (item) => item.channelName);
    const channels = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    return [
      { value: "", label: "Todos", count: facetItems.length },
      ...channels.map((channel) => ({ value: channel, label: channel, count: counts.get(channel) || 0 }))
    ];
  }, [diagramFilter, items, modelFilter, monthFilter, query]);

  const monthOptions = useMemo(() => {
    const facetItems = filterHistoryItems(items, {
      channel: channelFilter,
      model: modelFilter,
      diagram: diagramFilter,
      query,
      skip: "month"
    });
    const counts = countBy(facetItems, (item) => getMonthKey(item.processedAt || item.createdAt));
    const months = Array.from(counts.keys()).sort((a, b) => b.localeCompare(a));
    return [
      { value: "", label: "Todos", count: facetItems.length },
      ...months.map((month) => ({ value: month, label: formatMonth(month), count: counts.get(month) || 0 }))
    ];
  }, [channelFilter, diagramFilter, items, modelFilter, query]);

  const modelOptions = useMemo(() => {
    const facetItems = filterHistoryItems(items, {
      channel: channelFilter,
      month: monthFilter,
      diagram: diagramFilter,
      query,
      skip: "model"
    });
    const counts = countBy(facetItems, (item) => item.model);
    const models = Array.from(counts.keys()).sort((a, b) =>
      formatModel(a).localeCompare(formatModel(b), "es", { sensitivity: "base" })
    );
    return [
      { value: "", label: "Todos", count: facetItems.length },
      ...models.map((model) => ({ value: model, label: formatModel(model), count: counts.get(model) || 0 }))
    ];
  }, [channelFilter, diagramFilter, items, monthFilter, query]);

  const visibleItems = useMemo(() => {
    return filterHistoryItems(items, {
      channel: channelFilter,
      model: modelFilter,
      month: monthFilter,
      diagram: diagramFilter,
      query
    });
  }, [channelFilter, diagramFilter, items, modelFilter, monthFilter, query]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, {
      videoId: string;
      title: string;
      channelName?: string;
      latestDate: string;
      items: typeof visibleItems;
    }>();

    for (const item of visibleItems) {
      const key = item.videoUrl || item.title || item.filename;
      let group = groups.get(key);
      if (!group) {
        group = {
          videoId: key,
          title: item.videoTitle || item.title,
          channelName: item.channelName,
          latestDate: item.createdAt,
          items: []
        };
        groups.set(key, group);
      }
      group.items.push(item);
      if (Date.parse(item.createdAt) > Date.parse(group.latestDate)) {
        group.latestDate = item.createdAt;
      }
    }
    
    return Array.from(groups.values()).sort((a, b) => Date.parse(b.latestDate) - Date.parse(a.latestDate));
  }, [visibleItems]);

  const uniqueChannelsCount = useMemo(() => new Set(visibleItems.map(i => i.channelName).filter(Boolean)).size, [visibleItems]);

  return (
    <section className="history-section" aria-label="Historial">
      <div className="history-header">
        <div>
          <h2>Historial</h2>
          <p>Documentos generados anteriormente</p>
        </div>
        <div className="history-header-stats">
          <span className="count-badge">{uniqueChannelsCount} canales</span>
          <span className="count-badge">{groupedItems.length} videos</span>
          <span className="count-badge">{visibleItems.length} documentos</span>
        </div>
      </div>

      <div className="history-filters" aria-label="Filtros de historial">
        <div className="history-filter-field">
          <span>Canal</span>
          <HistoryFilterCombobox options={channelOptions} value={channelFilter} searchPlaceholder="Buscar canal..." onChange={setChannelFilter} />
        </div>
        <label>
          <span>Buscar</span>
          <div className="history-search">
            <Search size={13} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titulo..." />
          </div>
        </label>
        <div className="history-filter-field">
          <span>Mes</span>
          <HistoryFilterCombobox options={monthOptions} value={monthFilter} searchPlaceholder="Buscar mes..." onChange={setMonthFilter} />
        </div>
        <div className="history-filter-field">
          <span>Modelo</span>
          <HistoryFilterCombobox options={modelOptions} value={modelFilter} searchPlaceholder="Buscar modelo..." onChange={setModelFilter} />
        </div>
        <label className="history-diagram-filter">
          <input
            type="checkbox"
            checked={diagramFilter === "true"}
            onChange={(event) => setDiagramFilter(event.target.checked ? "true" : "")}
          />
          <span className="history-diagram-checkbox" aria-hidden="true" />
          <span className="history-diagram-toggle">Con diagrama</span>
        </label>
      </div>

      {items.length === 0 ? (
        <div className="history-empty">{isLoading ? "Cargando historial..." : "Todavia no hay documentos generados."}</div>
      ) : visibleItems.length === 0 ? (
        <div className="history-empty">No hay documentos que coincidan con los filtros.</div>
      ) : (
        <div className="history-list">
          {groupedItems.map((group) => {
            const isExpanded = expandedGroups.has(group.videoId);
            return (
              <div key={group.videoId} className="history-group">
                <div
                  className="history-group-header"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroup(group.videoId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroup(group.videoId);
                    }
                  }}
                >
                  <div className="history-group-title">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <strong>{group.title}</strong>
                    {group.videoId.startsWith("http") ? (
                      <a
                        href={group.videoId}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir vídeo de YouTube"
                        onClick={(e) => e.stopPropagation()}
                        className="history-external-link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                  <div className="history-group-meta">
                    {group.channelName ? <span className="channel-badge">{group.channelName}</span> : null}
                    {formatVideoDuration(group.items[0]) ? <span className="group-chip group-chip-video">Vídeo: {formatVideoDuration(group.items[0])}</span> : null}
                    {group.items[0].transcriptWords ? <span className="group-chip group-chip-words">{formatTranscriptWords(group.items[0].transcriptWords)}</span> : null}
                    <span className="count-badge group-chip-docs">{group.items.length} doc.</span>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="history-group-content">
                    {group.items.map((item) => {
                      const diagramCount = item.diagramCount || (item.hasDiagram ? 1 : 0);
                      const diagramChipText = diagramCount > 1 ? `+${diagramCount - 1}` : item.diagramLabel || "Generado";
          
                      return (
                      <article className="history-item nested" key={item.filename}>
                        <button className="history-open" type="button" onClick={() => onOpen(item.filename)}>
                          <Eye size={14} />
                        </button>
                        <div className="history-copy">
                          <TruncatedPromptName value={item.promptName || item.title} />
                          <small className="nested-chips">
                            <span className="history-doc-chip">{formatDate(item.createdAt)}</span>
                            {item.outputWords ? <span className="history-doc-chip history-doc-chip-output">{formatOutputWords(item.outputWords)}</span> : null}
                            {item.usageTotals?.all.durationMs ? <span className="history-doc-chip history-doc-chip-duration">{formatDuration(item.usageTotals.all.durationMs)}</span> : null}
                            {item.model ? <HistoryModelBadge value={formatModel(item.model)} /> : null}
                            {item.hasDiagram ? (
                              <span className="history-doc-chip" title="Este documento ya tiene un diagrama generado">
                                <GitFork size={12} />
                                {diagramChipText}
                              </span>
                            ) : null}
                          </small>
                        </div>
                        <DocumentActions
                          filename={item.filename}
                          downloadUrl={item.downloadUrl}
                          pdfUrl={item.pdfUrl}
                          diagramPrompts={diagramPrompts}
                          onOpen={onOpen}
                          onDiagram={onDiagram}
                          onTranscript={onViewTranscript}
                          hasDiagram={item.hasDiagram}
                          existingDiagramKind={item.diagramKind}
                          existingDiagramKinds={item.diagramKinds}
                          aiRuns={item.aiRuns}
                          disabled={diagramFilename === item.filename}
                        />
                      </article>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
