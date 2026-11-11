# Hallpass

**Why are you here?** Hallpass is a conference assistant that asks why you're going, plans the conference around it, re-plans after each check-in, and closes with an honest readout of whether you got what you came for.

Built at the Cloud Native Hackathon, Salt Lake City, 2026-11-09, for KubeCon + CloudNativeCon North America 2026.

Slice boundaries, the API contract, and the order of work are in [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md).

## Stack

- **Front end:** Vite, React, TypeScript, Tailwind CSS. Mobile-first.
- **Hosting and API:** one Cloudflare Worker serving the static app and `/api/*` routes.
- **AI:** Claude, through the Anthropic API. Keys are Worker secrets.
- **Data:** Elastic Cloud through its REST API, called only from the Worker.

## Layout

| Path | What |
| --- | --- |
| `src/` | React app |
| `worker/` | Worker entry, routes, Elastic client |
| `worker/routes/` | One file per API slice |
| `shared/types.ts` | Data shapes shared by the app and the Worker |
| `public/` | Static files: agenda, floor image, room hints |

## Status

Hallpass was a one-day hackathon project. There is no hosted instance. To try it, run it locally or deploy your own copy.

## Setup

Requires Node 22. Deploying also needs a Cloudflare account.

```sh
npm ci
cp .dev.vars.example .dev.vars   # fill in your own keys, or leave them empty
npm run dev
```

Open the local URL Vite prints. `/api/health` reports whether Claude and Elastic are configured, without showing keys. Add `?demo=1` to the app URL for demo mode.

### Environment variables

Secrets go in `.dev.vars` locally and `npx wrangler secret put <NAME>` for a deployed Worker. Every secret is optional: without Claude or Elastic the app still runs and labels the fallback it used.

| Name | Kind | Needed for |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Secret | Claude calls: intake interview, plans, re-plans, readouts, corner agent |
| `ELASTIC_URL` | Secret | Elastic Cloud deployment URL (`https://...`) |
| `ELASTIC_API_KEY` | Secret | Elastic API key with read/write on the Hallpass indexes |
| `TRACE_CONTENT` | Secret | Optional. `on` adds prompts and model output to trace spans. Leave unset |
| `CLAUDE_MODEL` | Var (`wrangler.jsonc`) | Model ID. Default `claude-opus-5-5` |
| `ELASTIC_INDEX_PREFIX` | Var (`wrangler.jsonc`) | Prefix for writable indexes. Default `hallpass` |
| `SESSIONS_INDEX` | Var (`wrangler.jsonc`) | Read-only agenda index. Default `hallpass-sessions` |

The scripts in `scripts/` also read `ELASTIC_INDEX_PREFIX`, `ELASTIC_INFERENCE_ID` (default `.elser-2-elastic`) and `SEED_ALLOW_SHARED_PREFIX` from the environment.

### Elastic (optional)

With `ELASTIC_URL` and `ELASTIC_API_KEY` in `.dev.vars`:

```sh
node --env-file=.dev.vars scripts/elastic-setup.mjs    # create indexes, load the agenda
node --env-file=.dev.vars scripts/search-check.mjs     # smoke-test session search
node --env-file=.dev.vars scripts/seed-demo-attendees.mjs  # fictional attendees for Insights
```

Semantic search uses an ELSER inference endpoint. Set `ELASTIC_INFERENCE_ID` if yours has a different ID.

### Deploy

```sh
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ELASTIC_URL
npx wrangler secret put ELASTIC_API_KEY
npm run deploy
```

`wrangler.jsonc` ships with `workers_dev` and `preview_urls` set to `false`. Set them to `true`, or add a route or custom domain, so your deployed Worker has a URL. Anyone with the URL can use your API keys through the app, so keep the rate limit in place and set a spend limit on your Anthropic key.

Traces and logs go to Workers Logs. To export to an OTLP backend such as Dash0, create destinations in your Cloudflare account and add them under `observability` in `wrangler.jsonc`.

## Design rules

- Attendee text travels in POST bodies, never URLs, because traces record URLs.
- Traces and logs went to Dash0 during the hackathon. Claude calls get a `claude.request` span with model, token counts and latency. Prompts and model output are added to that span only when the `TRACE_CONTENT` Worker secret is `on`, a demo switch that is off by default.
- Request bodies are read with a byte limit, and API calls are rate limited per browser.
- Elastic is never called from the browser.
- Model output is untrusted: no raw HTML, and session lists come from retrieved data, not model text.
- The organizer view shows aggregates only.
- No login. Hallpass is designed to run inside an event platform that already handles identity, so the demo gives each browser a random attendee ID.

## Data sources

- Session schedule: [KubeCon + CloudNativeCon North America 2026 schedule](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/schedule/), The Linux Foundation. Used with attribution. No affiliation or endorsement implied.

## AI use

This project was built with AI coding assistants. Code was reviewed and tested by the author. The app itself uses Claude for interviews, plans, check-in re-plans, readouts and the corner agent.
