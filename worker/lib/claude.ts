import { APIError, Anthropic } from "@anthropic-ai/sdk";
import type { Env } from "../env";
import { HttpError } from "./http";

export interface ClaudeJsonInput {
  system: string;
  user: string;
  /** JSON Schema for structured output. Not a forced tool call. */
  schema: Record<string, unknown>;
  maxTokens: number;
  timeoutMs: number;
}

export interface ClaudeStreamInput {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
  timeoutMs: number;
}

const MAX_TOKENS = 4096;
const MAX_TIMEOUT_MS = 20_000;

function client(env: Env): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, "upstream", "Claude is not configured");
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0 });
}

function limits(maxTokens: number, timeoutMs: number): { maxTokens: number; timeoutMs: number } {
  return {
    maxTokens: Math.min(MAX_TOKENS, Math.max(1, Math.floor(maxTokens))),
    timeoutMs: Math.min(MAX_TIMEOUT_MS, Math.max(1, Math.floor(timeoutMs))),
  };
}

function logClaude(kind: string, status: number | "ok" | "error", tokens?: { input_tokens?: number; output_tokens?: number }, ms?: number): void {
  const line = { status, ms: ms ?? null, input_tokens: tokens?.input_tokens ?? null, output_tokens: tokens?.output_tokens ?? null };
  if (status === "ok") console.log(kind, line);
  else console.error(kind, line);
}

/**
 * One structured JSON completion. Logs status and token counts only.
 * The parsed value is untrusted. Callers validate it.
 * Throws HttpError when Claude is not configured or the call fails. Callers fall back.
 */
export async function claudeJson<T>(env: Env, input: ClaudeJsonInput): Promise<T> {
  const anthropic = client(env);
  const { maxTokens, timeoutMs } = limits(input.maxTokens, input.timeoutMs);
  const started = Date.now();
  try {
    const message = await anthropic.messages.create(
      {
        model: env.CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: input.system,
        messages: [{ role: "user", content: input.user }],
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: input.schema },
        },
      },
      { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs) },
    );
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      logClaude("claude_json", "error", message.usage, Date.now() - started);
      throw new HttpError(502, "upstream", "Claude returned invalid JSON");
    }
    logClaude("claude_json", "ok", message.usage, Date.now() - started);
    return parsed as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const status = err instanceof APIError ? err.status : "error";
    logClaude("claude_json", status, undefined, Date.now() - started);
    throw new HttpError(502, "upstream", "Claude request failed");
  }
}

/** Text deltas for the corner agent. No tool loop. Logs status and token counts only. */
export async function* claudeStream(env: Env, input: ClaudeStreamInput): AsyncGenerator<string> {
  const anthropic = client(env);
  const { maxTokens, timeoutMs } = limits(input.maxTokens, input.timeoutMs);
  if (input.messages.length === 0) throw new HttpError(400, "bad_request", "Messages must be a list.");
  const started = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  try {
    const stream = await anthropic.messages.create(
      {
        model: env.CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: input.system,
        messages: input.messages,
        output_config: { effort: "low" },
        stream: true,
      },
      { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs) },
    );
    for await (const event of stream) {
      if (event.type === "message_start") inputTokens = event.message.usage.input_tokens;
      else if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
      else if (event.type === "message_delta") outputTokens = event.usage.output_tokens;
    }
    logClaude("claude_stream", "ok", { input_tokens: inputTokens, output_tokens: outputTokens }, Date.now() - started);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const status = err instanceof APIError ? err.status : "error";
    logClaude("claude_stream", status, undefined, Date.now() - started);
    throw new HttpError(502, "upstream", "Claude request failed");
  }
}

/** GET /api/health?deep=1. Returns no model text. */
export async function claudeSmoke(env: Env): Promise<{ claude: "ok" | "error"; fallback?: string }> {
  if (!env.ANTHROPIC_API_KEY) return { claude: "error", fallback: "Claude is not configured" };
  try {
    await claudeJson<{ ok: boolean }>(env, {
      system: "Reply with the schema only.",
      user: "ping",
      schema: {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
        additionalProperties: false,
      },
      maxTokens: 32,
      timeoutMs: 8_000,
    });
    return { claude: "ok" };
  } catch (err) {
    const fallback = err instanceof HttpError ? err.message : "Claude request failed";
    return { claude: "error", fallback };
  }
}
