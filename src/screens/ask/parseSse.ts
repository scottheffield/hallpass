/** One JSON payload from a POST /api/agent SSE `data:` line. */
export interface AgentStreamEvent {
  text?: string;
  fallback?: boolean;
  stub?: boolean;
  error?: string;
}

export interface AgentReplyState {
  text: string;
  fallback: boolean;
  stub: boolean;
  truncated: boolean;
  error: string | null;
}

export function emptyAgentReplyState(): AgentReplyState {
  return { text: "", fallback: false, stub: false, truncated: false, error: null };
}

/** Parse a single SSE line. Returns null for comments, blanks, or invalid JSON. */
export function parseSseEventLine(line: string): AgentStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(":")) return null;
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AgentStreamEvent;
  } catch {
    return null;
  }
}

/** Split buffered SSE text into complete lines and an incomplete tail. */
export function splitSseLines(buffer: string): { lines: string[]; remainder: string } {
  const parts = buffer.split("\n");
  const remainder = parts.pop() ?? "";
  return { lines: parts, remainder };
}

/** Fold one stream event into accumulated reply state (pure). */
export function applyStreamEvent(state: AgentReplyState, event: AgentStreamEvent): AgentReplyState {
  const next = { ...state };
  if (event.error === "truncated") {
    next.truncated = true;
  } else if (typeof event.error === "string" && event.error.length > 0) {
    next.error = event.error;
  }
  if (event.fallback === true) next.fallback = true;
  if (event.stub === true) next.stub = true;
  if (typeof event.text === "string" && event.text.length > 0) {
    next.text += event.text;
  }
  return next;
}
