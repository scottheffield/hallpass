import type { PlanItem } from "../../../shared/types";

/** Up to three lines for session detail and the alternatives sheet. */
export function sessionDetailBullets(item: PlanItem, alternativeTitle?: string): string[] {
  const bullets: string[] = [];
  if (item.beat_alternative) {
    const name = alternativeTitle?.trim() || item.beat_alternative.session_id;
    const why = item.beat_alternative.why.trim();
    if (why) bullets.push(`Picked over ${name}: ${why}`);
  }
  const clash = item.clash_note?.trim();
  if (clash) bullets.push(clash);
  return bullets.slice(0, 3);
}
