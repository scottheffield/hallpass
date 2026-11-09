import { barWidthPercent } from "./format";

export interface MetricBarProps {
  label: string;
  value: number;
  valueText: string;
  detail?: string;
  max: number;
}

/** Count with a supplementary bar. Numeric value is always visible (not color-only); bar is decorative. */
export function MetricBar({ label, value, valueText, detail, max }: MetricBarProps) {
  const width = barWidthPercent(value, max);

  return (
    <li className="list-none">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-base text-ink">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-ink">{valueText}</span>
      </div>
      {detail ? <p className="mt-0.5 text-sm text-muted">{detail}</p> : null}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-disabled" aria-hidden="true">
        <div className="h-full rounded-full bg-action" style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}
