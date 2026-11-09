import { describe, expect, it } from "vitest";
import type { LoadedAgenda } from "../lib/agenda";
import { agendaIsAuthoritative } from "./agenda-guard";

describe("agendaIsAuthoritative", () => {
  it("accepts only the loaded public agenda", () => {
    const real: LoadedAgenda = { sessions: [], source: "agenda" };
    const fixture: LoadedAgenda = {
      sessions: [],
      source: "fixture",
      fallback: "Illustrative agenda.",
    };
    expect(agendaIsAuthoritative(real)).toBe(true);
    expect(agendaIsAuthoritative(fixture)).toBe(false);
  });
});
