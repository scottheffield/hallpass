import type { CheckInRow } from "./rows";

/** Drop check-ins whose session is not on the loaded agenda. */
export function checkInsOnAgenda(checkins: CheckInRow[], agendaSessionIds: ReadonlySet<string>): CheckInRow[] {
  return checkins.filter((row) => agendaSessionIds.has(row.session_id));
}
