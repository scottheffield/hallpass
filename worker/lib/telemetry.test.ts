import { describe, expect, it } from "vitest";
import { captureInput, captureOutput, clip, contentCaptureOn } from "./telemetry";

describe("contentCaptureOn", () => {
  it("is off unless the switch is set to on, 1 or true", () => {
    expect(contentCaptureOn({})).toBe(false);
    expect(contentCaptureOn({ TRACE_CONTENT: "" })).toBe(false);
    expect(contentCaptureOn({ TRACE_CONTENT: "off" })).toBe(false);
    expect(contentCaptureOn({ TRACE_CONTENT: "no" })).toBe(false);
    expect(contentCaptureOn({ TRACE_CONTENT: "on" })).toBe(true);
    expect(contentCaptureOn({ TRACE_CONTENT: " ON\n" })).toBe(true);
    expect(contentCaptureOn({ TRACE_CONTENT: "1" })).toBe(true);
    expect(contentCaptureOn({ TRACE_CONTENT: "true" })).toBe(true);
  });
});

describe("clip", () => {
  it("keeps short text as is", () => {
    expect(clip("hello", 10)).toEqual({ text: "hello", truncated: false });
  });

  it("clips long text and says how much was cut", () => {
    const out = clip("abcdefghij", 4);
    expect(out.truncated).toBe(true);
    expect(out.text).toBe("abcd… [clipped 6 chars]");
  });
});

describe("captureInput", () => {
  it("writes GenAI convention JSON for the system prompt and messages", () => {
    const out = captureInput("Be brief.", [
      { role: "user", content: "Where is 155E?" },
      { role: "assistant", content: "Level 1." },
    ]);
    expect(out.truncated).toBe(false);
    expect(JSON.parse(out.attributes["gen_ai.system_instructions"])).toEqual([{ type: "text", content: "Be brief." }]);
    expect(JSON.parse(out.attributes["gen_ai.input.messages"])).toEqual([
      { role: "user", parts: [{ type: "text", content: "Where is 155E?" }] },
      { role: "assistant", parts: [{ type: "text", content: "Level 1." }] },
    ]);
  });

  it("clips each part and stays valid JSON", () => {
    const out = captureInput("s".repeat(50), [{ role: "user", content: "u".repeat(50) }], 10);
    expect(out.truncated).toBe(true);
    const messages = JSON.parse(out.attributes["gen_ai.input.messages"]);
    expect(messages[0].parts[0].content.startsWith("u".repeat(10) + "…")).toBe(true);
  });
});

describe("captureOutput", () => {
  it("records the text and finish reason", () => {
    const out = captureOutput('{"ok":true}', "end_turn");
    expect(JSON.parse(out.attributes["gen_ai.output.messages"])).toEqual([
      { role: "assistant", parts: [{ type: "text", content: '{"ok":true}' }], finish_reason: "end_turn" },
    ]);
  });

  it("marks a missing finish reason as unknown", () => {
    const out = captureOutput("", null);
    expect(JSON.parse(out.attributes["gen_ai.output.messages"])[0].finish_reason).toBe("unknown");
  });
});
