import { tracing } from "cloudflare:workers";

/** The parts of a Workers span we use. A no-op stands in when tracing is unavailable. */
export interface SpanLike {
  setAttributes(attributes: Record<string, boolean | number | string | undefined>): unknown;
  setStatus(status: { code: "unset" | "ok" | "error"; message?: string }): unknown;
  end(): void;
}

const NOOP: SpanLike = {
  setAttributes: () => undefined,
  setStatus: () => undefined,
  end: () => undefined,
};

function api(): Tracing | undefined {
  const t = tracing as Tracing | undefined;
  return t &&
    typeof t.enterSpan === "function" &&
    typeof t.startSpan === "function" &&
    typeof t.withActiveSpan === "function"
    ? t
    : undefined;
}

/** Runs fn inside an active span, so outbound fetches nest under it. Ends when fn settles. */
export function withSpan<T>(name: string, fn: (span: SpanLike) => Promise<T>): Promise<T> {
  const t = api();
  return t ? t.enterSpan(name, fn) : fn(NOOP);
}

/** A span the caller ends. For async generators, where a callback scope doesn't fit. */
export function startSpan(name: string): SpanLike {
  return api()?.startSpan(name) ?? NOOP;
}

/** Runs `fn` while `span` is active so outbound fetches nest under it. The span stays open after `fn` returns. */
export function withActiveSpan<T>(span: SpanLike, fn: () => T): T {
  const t = api();
  if (t && span !== NOOP) {
    return t.withActiveSpan(span as Parameters<Tracing["withActiveSpan"]>[0], fn);
  }
  return fn();
}
