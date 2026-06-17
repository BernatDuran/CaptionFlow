import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type ProviderId = "openai" | "google" | "nanogpt";

export type ModelOption = {
  id: string;
  label: string;
  limits?: { maxInputTokens: number | null };
};

type ModelComboboxProps = {
  models: ModelOption[];
  value: string;
  provider: ProviderId;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function formatModelDisplayId(id: string, provider: ProviderId) {
  if (provider === "nanogpt" && id.includes("/")) {
    return id.slice(id.indexOf("/") + 1).toLowerCase();
  }

  return id.toLowerCase();
}

export function ModelCombobox({ models, value, provider, onChange, disabled }: ModelComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showEmptyNotice, setShowEmptyNotice] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setShowEmptyNotice(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (models.length > 0) {
      setShowEmptyNotice(false);
      return;
    }

    if (!showEmptyNotice) return;
    const timeout = window.setTimeout(() => setShowEmptyNotice(false), 2800);
    return () => window.clearTimeout(timeout);
  }, [models.length, showEmptyNotice]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        const selectedEl = rootRef.current?.querySelector('[aria-selected="true"]');
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: "center" });
        }
      });
    }
  }, [isOpen]);

  const selected = models.find((model) => model.id === value);
  const sortedModels = useMemo(
    () =>
      [...models].sort((a, b) =>
        formatModelDisplayId(a.id, provider).localeCompare(formatModelDisplayId(b.id, provider), "es", {
          sensitivity: "base"
        })
      ),
    [models, provider]
  );

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sortedModels;

    return sortedModels.filter((model) => `${formatModelDisplayId(model.id, provider)} ${model.id}`.toLowerCase().includes(normalizedQuery));
  }, [provider, query, sortedModels]);

  return (
    <div className="model-combobox" ref={rootRef}>
      <button
        className="model-combobox-trigger"
        type="button"
        disabled={disabled}
        onClick={() => {
          if (models.length === 0) {
            setIsOpen(false);
            setQuery("");
            setShowEmptyNotice(true);
            return;
          }

          setShowEmptyNotice(false);
          setIsOpen((current) => !current);
        }}
      >
        <span>{selected ? formatModelDisplayId(selected.id, provider) : "Selecciona un modelo"}</span>
        <ChevronDown size={17} />
      </button>

      {showEmptyNotice ? (
        <div className="model-combobox-notice" role="alert">
          No hay modelos con el contexto mínimo configurado.
        </div>
      ) : null}

      {isOpen ? (
        <div className="model-combobox-popover" role="listbox">
          <label className="model-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar modelo..." autoFocus />
          </label>
          <div className="model-options">
            {filteredModels.length === 0 ? (
              <div className="model-empty">Sin resultados</div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={model.id === value}
                  onClick={() => {
                    onChange(model.id);
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  <span style={{ flex: 1, textAlign: "left" }}>{formatModelDisplayId(model.id, provider)}</span>
                  {model.limits?.maxInputTokens ? (
                    <span style={{ fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: "12px", fontWeight: "600", marginRight: model.id === value ? "8px" : "0" }}>
                      {Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(model.limits.maxInputTokens)}
                    </span>
                  ) : null}
                  {model.id === value ? <Check size={16} /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
