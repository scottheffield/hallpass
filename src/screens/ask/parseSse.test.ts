import { describe, expect, it } from "vitest";
import {
  applyStreamEvent,
  emptyAgentReplyState,
  parseSseEventLine,
  splitSseLines,
} from "./parseSse";

describe("parseSseEventLine", () => {
  it("parses a text delta", () => {
    expect(parseSseEventLine('data: {"text":"Next:"}')).toEqual({ text: "Next:" });
  });

  it("parses fallback and truncated markers", () => {
    expect(parseSseEventLine('data: {"fallback":true,"text":"Hi"}')).toEqual({
      fallback: true,
      text: "Hi",
    });
    expect(parseSseEventLine('data: {"error":"truncated"}')).toEqual({ error: "truncated" });
  });

  it("ignores comments and non-data lines", () => {
    expect(parseSseEventLine(": keep-alive")).toBeNull();
    expect(parseSseEventLine("event: ping")).toBeNull();
    expect(parseSseEventLine("not sse")).toBeNull();
  });
});

describe("splitSseLines", () => {
  it("keeps a partial final line in the remainder", () => {
    const { lines, remainder } = splitSseLines('data: {"text":"a"}\ndata: {"te');
    expect(lines).toHaveLength(1);
    expect(remainder).toBe('data: {"te');
  });
});

describe("applyStreamEvent", () => {
  it("accumulates text and flags", () => {
    let state = emptyAgentReplyState();
    state = applyStreamEvent(state, { text: "East " });
    state = applyStreamEvent(state, { text: "hall." });
    state = applyStreamEvent(state, { fallback: true });
    state = applyStreamEvent(state, { error: "truncated" });
    expect(state.text).toBe("East hall.");
    expect(state.fallback).toBe(true);
    expect(state.truncated).toBe(true);
  });
});
