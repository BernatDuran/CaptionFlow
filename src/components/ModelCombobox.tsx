import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { ModelOption, ProviderId } from "../api/types";
import { formatModelDisplayId } from "../utils/formatters";

export type { ModelOption, ProviderId };

type ModelComboboxProps = {
  models: ModelOption[];
  value: string;
  provider: ProviderId;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export { formatModelDisplayId };

function getModelContextTokens(model: ModelOption) {
  return model.limits?.maxInputTokens ?? model.contextTokens ?? null;
}

function getModelDetail(model: ModelOption, provider: ProviderId) {
  if (provider !== "nanogpt" || !model.id.includes("/")) return "";
  return model.id;
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
                  <span className="model-option-label">
                    <span>{formatModelDisplayId(model.id, provider)}</span>
                    {getModelDetail(model, provider) ? <small>{getModelDetail(model, provider)}</small> : null}
                  </span>
                  {getModelContextTokens(model) ? (
                    <span className={`model-option-token-chip${model.id === value ? " selected" : ""}`}>
                      {Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(getModelContextTokens(model) || 0)}
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
