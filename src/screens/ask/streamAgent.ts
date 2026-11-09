import type { AgentMessage, AgentRequest } from "../../../shared/api";
import { ATTENDEE_HEADER, type ApiError } from "../../../shared/types";
import { ApiFailure } from "../../lib/api";
import { getAttendeeId } from "../../lib/attendee";
import { demoNowHeader } from "../../lib/clock";
import { applyStreamEvent, emptyAgentReplyState, parseSseEventLine, splitSseLines, type AgentReplyState } from "./parseSse";

export const OFFLINE_AGENT_COPY =
  "I need a network connection to answer. Your plan and directions still work.";

export async function streamAgentReply(
  messages: AgentMessage[],
  options?: { signal?: AbortSignal; onProgress?: (state: AgentReplyState) => void },
): Promise<AgentReplyState> {
  const signal = options?.signal;
  const onProgress = options?.onProgress;
  const demo = demoNowHeader();
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [ATTENDEE_HEADER]: getAttendeeId(),
      ...(demo ? { [demo.name]: demo.value } : {}),
    },
    body: JSON.stringify({ messages } satisfies AgentRequest),
    signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiFailure(res.status, body);
  }

  if (!res.body) {
    throw new Error("No response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let state = emptyAgentReplyState();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { lines, remainder } = splitSseLines(buffer);
    buffer = remainder;
    for (const line of lines) {
      const event = parseSseEventLine(line);
      if (event) {
        state = applyStreamEvent(state, event);
        onProgress?.(state);
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseEventLine(buffer);
    if (event) {
      state = applyStreamEvent(state, event);
      onProgress?.(state);
    }
  }

  return state;
}
