import { describe, expect, it, vi } from "vitest";
import type { Env } from "../env";
import { fixturePlan, fixtureProfile } from "../lib/fixtures";
import * as store from "../lib/store";
import * as caseGen from "../case/case";
import { caseForAttending, shouldPersistCase } from "./case";

describe("shouldPersistCase", () => {
  it("is false when profile or plan came from fixtures", () => {
    expect(shouldPersistCase(null, fixturePlan("a"))).toBe(false);
    expect(shouldPersistCase(fixtureProfile("a"), null)).toBe(false);
  });

  it("is true when both profile and plan are stored", () => {
    expect(shouldPersistCase(fixtureProfile("a"), fixturePlan("a"))).toBe(true);
  });
});

describe("case route", () => {
  it("does not call putCase when profile and plan are missing", async () => {
    const putCase = vi.spyOn(store, "putCase").mockResolvedValue({
      attendee_id: "test-attendee",
      problems: [],
      sessions: [],
      bring_back: [],
      text: "sample",
    });
    vi.spyOn(store, "getProfile").mockResolvedValue(null);
    vi.spyOn(store, "getPlan").mockResolvedValue(null);
    vi.spyOn(caseGen, "generateCase").mockResolvedValue({
      stub: true,
      case: {
        attendee_id: "test-attendee",
        problems: ["problem"],
        sessions: ["1246200"],
        bring_back: ["goal"],
        text: "Draft built from your profile and plan (AI unavailable).",
      },
    });

    const request = new Request("https://hallpass.local/api/case", {
      method: "POST",
      headers: { "X-Hallpass-Attendee": "test-attendee" },
      body: "{}",
    });
    const env = {} as Env;
    const response = await caseForAttending(request, env, {} as ExecutionContext, "test-attendee");
    expect(response.status).toBe(200);
    expect(putCase).not.toHaveBeenCalled();

    putCase.mockRestore();
    vi.restoreAllMocks();
  });

  it("sets stub when the profile is not saved", async () => {
    vi.spyOn(store, "getProfile").mockResolvedValue(null);
    vi.spyOn(store, "getPlan").mockResolvedValue(fixturePlan("test-attendee"));
    vi.spyOn(caseGen, "generateCase").mockResolvedValue({
      stub: false,
      case: {
        attendee_id: "test-attendee",
        problems: ["problem"],
        sessions: ["1246200"],
        bring_back: ["goal"],
        text: "Case text from model.",
      },
    });

    const request = new Request("https://hallpass.local/api/case", {
      method: "POST",
      headers: { "X-Hallpass-Attendee": "test-attendee" },
      body: "{}",
    });
    const env = {} as Env;
    const response = await caseForAttending(request, env, {} as ExecutionContext, "test-attendee");
    const body = (await response.json()) as { stub?: boolean };
    expect(body.stub).toBe(true);

    vi.restoreAllMocks();
  });

  it("omits stub when profile and plan are stored and generation succeeds", async () => {
    vi.spyOn(store, "getProfile").mockResolvedValue(fixtureProfile("test-attendee"));
    vi.spyOn(store, "getPlan").mockResolvedValue(fixturePlan("test-attendee"));
    vi.spyOn(caseGen, "generateCase").mockResolvedValue({
      stub: false,
      case: {
        attendee_id: "test-attendee",
        problems: ["problem"],
        sessions: ["1246200"],
        bring_back: ["goal"],
        text: "Case text from model.",
      },
    });

    const request = new Request("https://hallpass.local/api/case", {
      method: "POST",
      headers: { "X-Hallpass-Attendee": "test-attendee" },
      body: "{}",
    });
    const env = {} as Env;
    const response = await caseForAttending(request, env, {} as ExecutionContext, "test-attendee");
    const body = (await response.json()) as { stub?: boolean };
    expect(body.stub).toBeUndefined();

    vi.restoreAllMocks();
  });
});
