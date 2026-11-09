import { describe, expect, it } from "vitest";
import type { Env } from "../env";
import { getSession, overlaps, sessionsByDay } from "./agenda";

function fixtureEnv(): Env {
  return {
    ASSETS: {
      fetch: async () => new Response("missing", { status: 404 }),
    },
  } as unknown as Env;
}

describe("overlaps", () => {
  it("detects a clash and treats a shared endpoint as free", () => {
    expect(
      overlaps(
        { start: "2026-11-10T13:10:00-07:00", end: "2026-11-10T13:50:00-07:00" },
        { start: "2026-11-10T13:30:00-07:00", end: "2026-11-10T14:10:00-07:00" },
      ),
    ).toBe(true);
    expect(
      overlaps(
        { start: "2026-11-10T10:00:00-07:00", end: "2026-11-10T10:40:00-07:00" },
        { start: "2026-11-10T10:40:00-07:00", end: "2026-11-10T11:20:00-07:00" },
      ),
    ).toBe(false);
  });
});

describe("agenda fixture", () => {
  it("loads the illustrative sample when agenda.json is missing", async () => {
    const env = fixtureEnv();
    const session = await getSession(env, "illustrative-incident-debugging");
    expect(session?.room).toBe("251 A-C");
    const tuesday = await sessionsByDay(env, "2026-11-10");
    expect(tuesday.some((item) => item.id === "illustrative-incident-debugging")).toBe(true);
    expect(tuesday.some((item) => item.id === "illustrative-contrib-first-pr")).toBe(false);
  });
});
