import type { HealthResponse } from "../../shared/api";
import type { Env } from "../env";
import { claudeSmoke } from "../lib/claude";
import { elasticSmoke } from "../lib/elastic";
import { json } from "../lib/http";

/** Reports which integrations are configured. Never returns key values or model text. */
export async function health(request: Request, env: Env): Promise<Response> {
  const body: HealthResponse = {
    ok: true,
    model: env.CLAUDE_MODEL,
    configured: {
      claude: Boolean(env.ANTHROPIC_API_KEY),
      elastic: Boolean(env.ELASTIC_URL && env.ELASTIC_API_KEY),
    },
  };
  if (new URL(request.url).searchParams.get("deep") === "1") {
    const [claude, elastic] = await Promise.all([claudeSmoke(env), elasticSmoke(env)]);
    Object.assign(body, claude, elastic);
  }
  return json(body);
}
