import { useId } from "react";

export interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: "text" | "email" | "search";
  autoComplete?: string;
  disabled?: boolean;
}

export function Field({
  label,
  name,
  value,
  onChange,
  hint,
  placeholder,
  type = "text",
  autoComplete,
  disabled,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border-2 border-line bg-surface px-3 text-base text-ink"
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
