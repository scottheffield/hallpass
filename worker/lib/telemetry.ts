/**
 * Pure helpers for Claude span attributes. Content capture is a demo switch:
 * prompts and model output reach span attributes only when TRACE_CONTENT is on.
 * Shapes follow the OpenTelemetry GenAI conventions (gen_ai.input.messages and friends).
 */

/** Max characters kept per text part. Long agenda prompts get clipped, not dropped. */
export const CONTENT_LIMIT = 12_000;

export function contentCaptureOn(env: { TRACE_CONTENT?: string }): boolean {
  const value = env.TRACE_CONTENT?.trim().toLowerCase();
  return value === "on" || value === "1" || value === "true";
}

export interface Clipped {
  text: string;
  truncated: boolean;
}

export function clip(text: string, limit = CONTENT_LIMIT): Clipped {
  if (text.length <= limit) return { text, truncated: false };
  return { text: `${text.slice(0, limit)}… [clipped ${text.length - limit} chars]`, truncated: true };
}

export interface CapturedContent {
  attributes: Record<string, string>;
  truncated: boolean;
}

/** System prompt and input messages, as JSON strings for span attributes. */
export function captureInput(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  limit = CONTENT_LIMIT,
): CapturedContent {
  const sys = clip(system, limit);
  let truncated = sys.truncated;
  const input = messages.map((message) => {
    const part = clip(message.content, limit);
    truncated ||= part.truncated;
    return { role: message.role, parts: [{ type: "text", content: part.text }] };
  });
  return {
    truncated,
    attributes: {
      "gen_ai.system_instructions": JSON.stringify([{ type: "text", content: sys.text }]),
      "gen_ai.input.messages": JSON.stringify(input),
    },
  };
}

/** Model output, as a JSON string for a span attribute. */
export function captureOutput(text: string, finishReason: string | null | undefined, limit = CONTENT_LIMIT): CapturedContent {
  const out = clip(text, limit);
  return {
    truncated: out.truncated,
    attributes: {
      "gen_ai.output.messages": JSON.stringify([
        { role: "assistant", parts: [{ type: "text", content: out.text }], finish_reason: finishReason ?? "unknown" },
      ]),
    },
  };
}
