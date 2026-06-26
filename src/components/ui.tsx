import type { ButtonHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "subtle" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  compact?: boolean;
};

export function Button({ variant = "secondary", compact, className = "", ...props }: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "primary-button"
      : variant === "subtle"
        ? "primary-button subtle-primary-button"
        : variant === "danger"
          ? "secondary-button danger-button"
          : "secondary-button";
  return <button className={`${variantClass}${compact ? " compact-button" : ""}${className ? ` ${className}` : ""}`} {...props} />;
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({ className = "", ...props }: IconButtonProps) {
  return <button className={`icon-button${className ? ` ${className}` : ""}`} {...props} />;
}

type ChipProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function Chip({ children, className = "", title }: ChipProps) {
  return (
    <span className={`group-chip${className ? ` ${className}` : ""}`} title={title}>
      {children}
    </span>
  );
}

type FieldProps = LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
};

export function Field({ label, children, hint, className = "", ...props }: FieldProps) {
  return (
    <label className={`field${className ? ` ${className}` : ""}`} {...props}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

type TabItem<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  return (
    <div className="tabs-row" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`empty-state${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function StatusBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`count-badge${className ? ` ${className}` : ""}`}>{children}</span>;
}
