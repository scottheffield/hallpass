import { useId } from "react";
import styles from "./delight.module.css";

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

export interface ChoiceProps {
  legend: string;
  name: string;
  /** Selected value. Empty string means nothing is selected. */
  value: string;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
  hint?: string;
}

export function Choice({ legend, name, value, options, onChange, hint }: ChoiceProps) {
  const hintId = useId();

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={hint ? hintId : undefined}>
      <legend className="mb-1 text-base font-semibold text-ink">{legend}</legend>
      {hint ? (
        <p id={hintId} className="mb-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`${styles.choice} choice-card flex min-h-12 cursor-pointer items-start rounded-xl border-2 px-3 py-3 ${selected ? "border-action" : "border-line"}`}
          >
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            <span className="flex w-full items-start justify-between gap-3">
              <span>
                <span className="block font-semibold text-ink">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-sm text-muted">{option.description}</span>
                ) : null}
              </span>
              {selected ? (
                <span className="shrink-0 text-sm font-semibold text-action-quiet">Selected</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
