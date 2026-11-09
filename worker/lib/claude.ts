import { APIError, Anthropic } from "@anthropic-ai/sdk";
import type { Env } from "../env";
import { HttpError } from "./http";
import { captureInput, captureOutput, contentCaptureOn } from "./telemetry";
import { startSpan, withSpan, type SpanLike } from "./trace";

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

/** Error class names and HTTP statuses only. Never error messages, which can echo prompts. */
function errorType(err: unknown): string {
  if (err instanceof APIError && err.status) return String(err.status);
  return err instanceof Error ? err.name : "error";
}

/**
 * One `claude.request` span per model call, with OpenTelemetry GenAI attributes:
 * model, token counts, finish reason and latency. Prompts and output are added
 * only when TRACE_CONTENT is on (demo switch, off by default).
 */
function openSpan(span: SpanLike, env: Env, kind: "json" | "stream", maxTokens: number, capture: boolean): void {
  span.setAttributes({
    "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "anthropic",
    "gen_ai.system": "anthropic",
    "gen_ai.request.model": env.CLAUDE_MODEL,
    "gen_ai.request.max_tokens": maxTokens,
    "hallpass.claude.kind": kind,
    "hallpass.content_captured": capture,
  });
}

function recordInput(span: SpanLike, system: string, messages: ClaudeStreamInput["messages"]): boolean {
  const captured = captureInput(system, messages);
  span.setAttributes(captured.attributes);
  return captured.truncated;
}

function recordOutput(span: SpanLike, text: string, finishReason: string | null | undefined): boolean {
  const captured = captureOutput(text, finishReason);
  span.setAttributes(captured.attributes);
  return captured.truncated;
}

/**
 * One structured JSON completion. Logs status and token counts only.
 * The parsed value is untrusted. Callers validate it.
 * Throws HttpError when Claude is not configured or the call fails. Callers fall back.
 */
export async function claudeJson<T>(env: Env, input: ClaudeJsonInput): Promise<T> {
  const anthropic = client(env);
  const { maxTokens, timeoutMs } = limits(input.maxTokens, input.timeoutMs);
  return withSpan("claude.request", async (span) => {
    const capture = contentCaptureOn(env);
    openSpan(span, env, "json", maxTokens, capture);
    let truncated = capture && recordInput(span, input.system, [{ role: "user", content: input.user }]);
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
      const ms = Date.now() - started;
      span.setAttributes({
        "gen_ai.response.id": message.id,
        "gen_ai.response.model": message.model,
        "gen_ai.response.finish_reasons": message.stop_reason ?? "unknown",
        "gen_ai.usage.input_tokens": message.usage.input_tokens,
        "gen_ai.usage.output_tokens": message.usage.output_tokens,
        "hallpass.claude.latency_ms": ms,
      });
      if (capture) truncated = recordOutput(span, text, message.stop_reason) || truncated;
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        logClaude("claude_json", "error", message.usage, ms);
        span.setAttributes({ "hallpass.claude.status": "error", "error.type": "invalid_json" });
        span.setStatus({ code: "error", message: "invalid_json" });
        throw new HttpError(502, "upstream", "Claude returned invalid JSON");
      }
      logClaude("claude_json", "ok", message.usage, ms);
      span.setAttributes({ "hallpass.claude.status": "ok" });
      span.setStatus({ code: "ok" });
      return parsed as T;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      const status = err instanceof APIError ? err.status : "error";
      const ms = Date.now() - started;
      logClaude("claude_json", status, undefined, ms);
      span.setAttributes({ "hallpass.claude.status": "error", "error.type": errorType(err), "hallpass.claude.latency_ms": ms });
      span.setStatus({ code: "error", message: errorType(err) });
      throw new HttpError(502, "upstream", "Claude request failed");
    } finally {
      if (capture) span.setAttributes({ "hallpass.content_truncated": truncated });
    }
  });
}

/** Text deltas for the corner agent. No tool loop. Logs status and token counts only. */
export async function* claudeStream(env: Env, input: ClaudeStreamInput): AsyncGenerator<string> {
  const anthropic = client(env);
  const { maxTokens, timeoutMs } = limits(input.maxTokens, input.timeoutMs);
  if (input.messages.length === 0) throw new HttpError(400, "bad_request", "Messages must be a list.");
  const capture = contentCaptureOn(env);
  const span = startSpan("claude.request");
  openSpan(span, env, "stream", maxTokens, capture);
  let truncated = capture && recordInput(span, input.system, input.messages);
  const started = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let stopReason: string | null | undefined;
  let output = "";
  // Stays "cancelled" if the reader stops early, for example when the browser disconnects.
  let status = "cancelled";
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
      if (event.type === "message_start") {
        inputTokens = event.message.usage.input_tokens;
        span.setAttributes({ "gen_ai.response.id": event.message.id, "gen_ai.response.model": event.message.model });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        if (capture) output += event.delta.text;
        yield event.delta.text;
      } else if (event.type === "message_delta") {
        outputTokens = event.usage.output_tokens;
        stopReason = event.delta.stop_reason;
      }
    }
    status = "ok";
    span.setStatus({ code: "ok" });
    logClaude("claude_stream", "ok", { input_tokens: inputTokens, output_tokens: outputTokens }, Date.now() - started);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    status = "error";
    span.setAttributes({ "error.type": errorType(err) });
    span.setStatus({ code: "error", message: errorType(err) });
    logClaude("claude_stream", err instanceof APIError ? err.status : "error", undefined, Date.now() - started);
    throw new HttpError(502, "upstream", "Claude request failed");
  } finally {
    span.setAttributes({
      "gen_ai.usage.input_tokens": inputTokens,
      "gen_ai.usage.output_tokens": outputTokens,
      "gen_ai.response.finish_reasons": stopReason ?? undefined,
      "hallpass.claude.latency_ms": Date.now() - started,
      "hallpass.claude.status": status,
    });
    if (capture) {
      truncated = recordOutput(span, output, stopReason) || truncated;
      span.setAttributes({ "hallpass.content_truncated": truncated });
    }
    span.end();
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
