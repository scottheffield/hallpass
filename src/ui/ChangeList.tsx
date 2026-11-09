export interface ChangeListProps {
  /** One to three short lines. Extra items are not rendered. */
  items: readonly string[];
  label?: string;
  labelId?: string;
}

export function ChangeList({ items, label, labelId }: ChangeListProps) {
  const visible = items.slice(0, 3).filter((item) => item.trim().length > 0);
  if (visible.length === 0) return null;

  return (
    <ul
      className="m-0 flex list-none flex-col gap-2 p-0"
      aria-label={labelId ? undefined : label}
      aria-labelledby={labelId}
    >
      {visible.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2 text-base leading-snug text-ink">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
