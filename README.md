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

## Setup

Requires Node 22 and a Cloudflare account.

```sh
npm ci
cp .dev.vars.example .dev.vars   # fill in your own keys
npm run dev
```

Open the local URL Vite prints. `/api/health` reports whether Claude and Elastic are configured, without showing keys.

### Deploy

```sh
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ELASTIC_URL
npx wrangler secret put ELASTIC_API_KEY
npm run deploy
```

## Design rules

- Attendee text travels in POST bodies, never URLs, because traces record URLs.
- Request bodies are read with a byte limit, and API calls are rate limited per browser.
- Elastic is never called from the browser.
- Model output is untrusted: no raw HTML, and session lists come from retrieved data, not model text.
- The organizer view shows aggregates only.
- No login. Hallpass is designed to run inside an event platform that already handles identity, so the demo gives each browser a random attendee ID.

## Data sources

- Session schedule: [KubeCon + CloudNativeCon North America 2026 schedule](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/schedule/), The Linux Foundation. Used with attribution. No affiliation or endorsement implied.

## AI use

This project was built with AI coding assistants. Code was reviewed and tested by the author. The app itself uses Claude for interviews, plans, check-in re-plans, readouts and the corner agent.
