import type { AgentMessage } from "../../shared/api";
import type { Env } from "../env";
import { claudeStream } from "../lib/claude";
import { HttpError } from "../lib/http";
import type { AgentContext } from "./context";
import { buildSystemPrompt, claudeMessages } from "./context";
import { fallbackAnswer } from "./fallback";
import type { Room } from "../../shared/types";

export const AGENT_MAX_TOKENS = 400;
export const AGENT_TIMEOUT_MS = 15_000;

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-store",
};

function sseLine(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function claudeConfigured(env: Env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

/** POST /api/agent body is already validated. Streams JSON SSE events with a text field. */
export function agentSseResponse(
  env: Env,
  ctx: AgentContext,
  messages: AgentMessage[],
  rooms: Room[],
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(sseLine(payload)));
      const close = () => {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      if (!claudeConfigured(env)) {
        send({ fallback: true, text: fallbackAnswer(ctx, messages, rooms) });
        close();
        return;
      }

      let sent = false;
      try {
        const system = buildSystemPrompt(ctx);
        for await (const chunk of claudeStream(env, {
          system,
          messages: claudeMessages(messages),
          maxTokens: AGENT_MAX_TOKENS,
          timeoutMs: AGENT_TIMEOUT_MS,
        })) {
          if (chunk) {
            send({ text: chunk });
            sent = true;
          }
        }
        close();
      } catch (err) {
        if (err instanceof HttpError && err.status === 400) {
          send({ error: err.message });
          close();
          return;
        }
        console.error("agent_stream", { name: err instanceof Error ? err.name : "unknown" });
        send(sent ? { error: "truncated" } : { fallback: true, text: fallbackAnswer(ctx, messages, rooms) });
        close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
