export type PromptSummary = {
  id: string;
  name: string;
  description: string;
  outputFilenamePrefix: string;
  temperature: number;
  content: string;
};

type PromptSelectorProps = {
  prompts: PromptSummary[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isCustomizing?: boolean;
  onToggleCustomizing?: (checked: boolean) => void;
};

export function PromptSelector({ prompts, value, onChange, disabled, isCustomizing, onToggleCustomizing }: PromptSelectorProps) {
  const selected = prompts.find((prompt) => prompt.id === value);

  return (
    <label className="field">
      <span>Tipo de procesamiento</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || prompts.length === 0}>
        {prompts.length === 0 ? <option value="">No hay prompts disponibles</option> : null}
        {prompts.map((prompt) => (
          <option key={prompt.id} value={prompt.id}>
            {prompt.name}
          </option>
        ))}
      </select>
      {selected ? (
        <label className="checkbox-field" style={{ position: "absolute", top: "calc(100% + 7px)", left: 0, right: 0, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", margin: 0 }}>
          <input
            type="checkbox"
            checked={isCustomizing}
            onChange={(e) => onToggleCustomizing?.(e.target.checked)}
            disabled={disabled}
            style={{ width: "14px", height: "14px", margin: 0, cursor: "pointer" }}
          />
          <span style={{ fontSize: "12px", fontWeight: 400, color: "#64748b" }}>Personalizar prompt</span>
        </label>
      ) : null}
    </label>
  );
}
