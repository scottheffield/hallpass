import { useId } from "react";
import styles from "./delight.module.css";

export interface TextAreaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  /** "title" renders the label as an h2 for the entry question. */
  labelAppearance?: "field" | "title";
}

export function TextArea({
  label: labelText,
  name,
  value,
  onChange,
  hint,
  placeholder,
  rows = 4,
  disabled,
  labelAppearance = "field",
}: TextAreaProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const labelClass =
    labelAppearance === "title"
      ? "font-display text-2xl font-semibold leading-tight text-ink"
      : "text-base font-semibold text-ink";
  const label = (
    <label htmlFor={id} className={labelClass}>
      {labelText}
    </label>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {labelAppearance === "title" ? <h2 className="m-0 font-normal">{label}</h2> : label}
      <textarea
        id={id}
        name={name}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value)}
        className={`${styles.writingField} min-h-28 w-full resize-y rounded-xl border-2 border-line px-3 py-3 text-base leading-relaxed text-ink`}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
