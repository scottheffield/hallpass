import type { LoadedAgenda } from "../lib/agenda";

/** Session filtering is only valid against the real conference agenda, not the illustrative fixture. */
export function agendaIsAuthoritative(agenda: LoadedAgenda): agenda is LoadedAgenda & { source: "agenda" } {
  return agenda.source === "agenda";
}
