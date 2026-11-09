import type { Env } from "../env";
import { json } from "../lib/http";

/** Reports which integrations are configured. Never returns key values. */
export async function health(_request: Request, env: Env): Promise<Response> {
  return json({
    ok: true,
    model: env.CLAUDE_MODEL,
    configured: {
      claude: Boolean(env.ANTHROPIC_API_KEY),
      elastic: Boolean(env.ELASTIC_URL && env.ELASTIC_API_KEY),
    },
  });
}
