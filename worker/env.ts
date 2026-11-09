export interface Env {
  ASSETS: Fetcher;
  API_LIMITER: RateLimit;

  // vars (wrangler.jsonc)
  ELASTIC_INDEX_PREFIX: string;
  /** Shared read-only agenda index. Not prefixed. Do not write to it. */
  SESSIONS_INDEX: string;
  CLAUDE_MODEL: string;

  // secrets (.dev.vars locally, `wrangler secret put` when deployed)
  ANTHROPIC_API_KEY?: string;
  ELASTIC_URL?: string;
  ELASTIC_API_KEY?: string;
}
