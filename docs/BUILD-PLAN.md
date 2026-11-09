# Hallpass build plan

**As of:** 2026-11-09 11:30 MT. **Submit by:** 5:15 (closes 5:30).
**Product:** `../hackathon-plan/2026-11-06-hackathon-product-spec.md` (outside the repo). **UX draft:** [docs/ux/01-flows-and-wireframes.md](ux/01-flows-and-wireframes.md). **Agent rules:** [AGENTS.md](../AGENTS.md). **Slice briefs:** [docs/briefs/](briefs/).

## How this works

1. **Phase 0 (seams), one PR, done locally.** Before any cloud agent starts, `main` gets every file boundary, API contract, stub and fixture the slices need. After that, each agent edits only files it owns, so PRs don't collide.
2. **Rolling waves.** At most 4 agents run at once. When a PR merges, start the next brief in the queue. Don't batch by wave.
3. **Every slice works without the others.** Stubs return fixtures, search falls back to `agenda.json`, and the store falls back to memory when Elastic isn't configured. No agent waits on another agent's PR.
4. **To start an agent,** paste: `Read AGENTS.md and docs/briefs/<file>.md on main, then build that slice. Open one PR.`

## Decisions (made for speed; change before Phase 0 merges, not after)

| Area | Decision | Why |
| --- | --- | --- |
| Intake | Guided 3 steps (purpose, work, pace), per the UX draft. One model call turns answers into an editable profile, with at most one clarifying question | Faster to build and more reliable than a chat loop. Still text-first |
| Check-in | Keep both questions (types and organizer metrics use them). The re-plan comes back as a **proposal** the attendee accepts or keeps | Matches the UX draft; the "what changed" demo moment still works |
| Navigation | Home picks the right view, plus stable Today, Plan and Goals tabs | Simpler to build than pure auto-routing, and nothing disappears |
| Session data in the browser | Static `public/agenda.json`. Plans and API responses carry session IDs only, and the UI joins them to the agenda | Offline for free, small payloads, model can't invent sessions |
| Demo clock | Client sends `X-Hallpass-Now` when demo mode is on. Worker reads time only through `worker/lib/clock.ts` | One place to fake time; real time in production |
| Goal and gap themes | Fixed theme list in `shared/event.ts`. The model tags profiles and readouts with themes; Insights counts themes | Aggregates without clustering free text, and no raw text reaches organizers |
| Corner agent | Streamed reply, no tool loop. Context (plan, next items, rooms, clock) is packed into the prompt | Removes the riskiest part of the POC |
| Tests | Add `vitest`, for pure logic only: plan validation, clash rules, change diff, theme counting | Gives Gitar a real check; one dev dependency |
| Sessions index | Shared, read-only `hallpass-sessions`. Writable indexes use `ELASTIC_INDEX_PREFIX`, which each agent overrides in `.dev.vars` | Agents can't clobber each other's test data or the agenda |

## API contract (Phase 0 writes this to `shared/api.ts`)

All attendee text goes in POST bodies. Every response is JSON except `/api/agent` (SSE). Errors use `ApiError`.

| Route | Request | Response | Owner |
| --- | --- | --- | --- |
| `GET /api/health` | | `{ ok, model, configured }` | Phase 0 |
| `POST /api/interview` | `{ answers: IntakeAnswers }` | `{ profile: ProfileDraft, clarify?: string }` | Intake |
| `POST /api/profile` | `{ profile: ProfileDraft }` | `{ profile: Profile }` | Intake |
| `POST /api/profile/get` | `{}` | `{ profile: Profile \| null }` | Intake |
| `POST /api/plan` | `{ day: string }` (generate or regenerate one day) | `{ plan: Plan }` | Plan |
| `POST /api/plan/get` | `{}` | `{ plan: Plan \| null }` | Plan |
| `POST /api/plan/edit` | `{ day, session_id, action: "pin" \| "drop" \| "swap" }` | `{ plan: Plan, changes: PlanChange[] }` | Plan |
| `POST /api/checkin` | `{ session_id, worth_it, moved_goal, note? }` | `{ checkin: CheckIn, proposal: PlanProposal \| null }` | Check-in |
| `POST /api/plan/apply` | `{ proposal_id, accept: boolean }` | `{ plan: Plan }` | Check-in |
| `POST /api/case` | `{}` | `{ case: CaseForAttending }` | Case and readout |
| `POST /api/readout` | `{}` | `{ readout: Readout }` | Case and readout |
| `POST /api/agent` | `{ messages: AgentMessage[] }` (max 10, each max 1,000 chars) | SSE text stream | Corner agent |
| `GET /api/insights` | | `Insights` | Organizer |
| `POST /api/demo/load` | `{}` | `{ profile: Profile, plan: Plan }` | Data |

New types Phase 0 adds: `IntakeAnswers`, `ProfileDraft` (Profile without `attendee_id`, `updated_at`), `PlanChange { kind: "added" | "removed" | "moved" | "break"; session_id?; text }`, `PlanProposal { id; day; changes: PlanChange[]; days: Plan["days"] }`, `AgentMessage { role: "user" | "assistant"; content }`, `Profile.goal_themes?: string[]`, `Readout.gap_themes?: string[]`, `Plan.pending?: PlanProposal`, and `NOW_HEADER = "X-Hallpass-Now"`.

Check-in documents use the ID `${attendee_id}:${session_id}`, so a retried offline check-in overwrites instead of duplicating.

## Phase 0: seams (11:30 to about 12:05, local, one PR)

Commit the pinned `package.json` and lockfile changes first. Then:

### Worker

- [ ] `worker/routes/<slice>.ts` for each slice, each exporting stub handlers that return fixtures with a `"stub": true` field. `worker/index.ts` imports them all, so no slice ever edits the route table.
- [ ] `worker/lib/clock.ts`: `now(request)`, honoring `X-Hallpass-Now` only when it parses as ISO with an offset.
- [ ] `worker/lib/claude.ts`: `claudeJson<T>({ system, user, schema, maxTokens, timeoutMs })` using structured outputs (not forced tool calls), `low` effort, a timeout and a token cap. `claudeStream(...)` for the agent. Logs status and token counts only.
- [ ] `worker/lib/store.ts`: typed functions (`getProfile`, `putProfile`, `getPlan`, `putPlan`, `putCheckIn`, `listCheckIns`, `putReadout`, `putCase`). Uses Elastic when configured, otherwise an in-memory map (per isolate, dev only).
- [ ] `worker/lib/agenda.ts`: loads `agenda.json` through `env.ASSETS`, with `getSession(id)`, `sessionsByDay(day)` and `overlaps(a, b)`.
- [ ] `worker/lib/search.ts`: `searchSessions({ text, field, day, size })` interface. Phase 0 ships the keyword fallback over the agenda; the Data slice adds Elastic.
- [ ] `worker/plan/index.ts`: exported `generateDay(...)` and `replanDay(...)` signatures with stub bodies that return the fixture plan unchanged. Check-in calls `replanDay`; Plan implements it.
- [ ] `wrangler.jsonc`: `workers_dev`, `preview_urls`, a `previews` block repeating the rate limiter, and a `SESSIONS_INDEX` var.

### Shared

- [ ] `shared/api.ts` from the table above.
- [ ] `shared/event.ts`: KubeCon event config with intake question wording, examples, 8 to 12 goal themes, and conference days (`2026-11-10` to `2026-11-12`, offset `-07:00`).
- [ ] `shared/fixtures/`: `demo-profile.json`, `demo-plan.json`, and `sessions-sample.json` with about 15 illustrative sessions (labeled illustrative) until the real agenda lands.

### Browser

- [ ] `src/App.tsx`: a small state router (no router library) with Today, Plan and Goals tabs and a home that picks the view. It never needs editing by slices.
- [ ] `src/views/<Name>View.tsx` stubs: Intake, Confirm, Goals, Plan, Today, Directions, CheckIn, Case, Readout, Insights. Each renders its name and fixture data.
- [ ] `src/components/AskHallpass.tsx` and `src/components/DemoBar.tsx` stubs (demo mode via `?demo=1`, saved in `localStorage`).
- [ ] `src/ui/`: minimal primitives with fixed props (`Screen`, `Stack`, `Button`, `Field`, `TextArea`, `Choice`, `Sheet`, `Notice`). UX shell restyles internals only.
- [ ] `src/lib/agenda.ts` (load and join `agenda.json`), `src/lib/clock.ts` (demo clock), and `src/lib/api.ts` sending `X-Hallpass-Now`.

### Repo

- [ ] `vitest` with one passing test, and `npm test` added to CI.
- [ ] `.gitar/review/hallpass.md` with the design rules from the README.
- [ ] README: link this plan.

**Done when** `npm run build` and `npm test` pass, every view renders from fixtures in `npm run dev`, every route returns a stub, and the Worker deploys to the live URL.

## Queue

| Order | Brief | Starts | Owns (only these files) | Depends on |
| --- | --- | --- | --- | --- |
| A | [01-data](briefs/01-data.md) | 11:30, alongside Phase 0 | `scripts/`, `public/agenda.json`, `public/rooms.json`, `public/floor/`, `worker/lib/search.ts`, `worker/routes/demo.ts`, `shared/fixtures/` | None. Search PR after Phase 0 merges |
| B | [02-ux-shell](briefs/02-ux-shell.md) | After Phase 0 | `src/ui/`, `src/index.css`, `src/App.tsx` layout only | Phase 0 |
| 1 | [10-intake](briefs/10-intake.md) | After Phase 0 | `worker/routes/interview.ts`, `worker/routes/profile.ts`, `worker/intake/`, `src/views/IntakeView.tsx`, `src/views/ConfirmView.tsx`, `src/views/GoalsView.tsx` | Phase 0 |
| 2 | [11-plan](briefs/11-plan.md) | After Phase 0 | `worker/routes/plan.ts`, `worker/plan/`, `src/views/PlanView.tsx` | Phase 0. Better with Data's search, not blocked by it |
| 3 | [12-checkin-today](briefs/12-checkin-today.md) | After Phase 0 | `worker/routes/checkin.ts`, `worker/checkin/`, `src/views/TodayView.tsx`, `src/views/CheckInView.tsx` | Phase 0. Uses `replanDay` |
| 4 | [20-case-readout](briefs/20-case-readout.md) | First merge after Phase 0 | `worker/routes/case.ts`, `worker/routes/readout.ts`, `worker/summary/`, `src/views/CaseView.tsx`, `src/views/ReadoutView.tsx` | Fixtures only |
| 5 | [21-agent-directions](briefs/21-agent-directions.md) | Next merge | `worker/routes/agent.ts`, `worker/agent/`, `src/components/AskHallpass.tsx`, `src/views/DirectionsView.tsx` | `public/rooms.json` from Data |
| 6 | [22-organizer](briefs/22-organizer.md) | Next merge | `worker/routes/insights.ts`, `worker/insights/`, `scripts/seed-demo-attendees.mjs`, `src/views/InsightsView.tsx` | Elastic indexes from Data |
| 7 | [23-offline](briefs/23-offline.md) | Next merge | `public/sw.js`, `src/lib/offline.ts`, `src/lib/api.ts`, `src/main.tsx` | Views exist |
| 8 | Accessibility and polish pass | 3:30 | Any view, small PRs | Full flow on live URL |

Shared files (`shared/*.ts`, `worker/index.ts`, `worker/lib/*` except `search.ts`, `wrangler.jsonc`, `package.json`) change only in small, separate PRs that Scott reviews first. An agent that needs one opens that PR alone and says so.

## Timeline

| Time | Scott | Agents |
| --- | --- | --- |
| 11:30 | Phase 0 with Claude Code locally. Cursor cloud environment and secrets | Data (A) |
| 12:05 | Merge Phase 0, deploy, check `/api/health` on the live URL | Start B, 1, 2, 3 |
| 12:05 to 1:00 | Review and merge as PRs land. Draft `public/rooms.json` hints and intake wording if Data hasn't | 4 slots busy; start 4, 5, 6 as each merges |
| 1:00 | Lunch. Queue the next brief before leaving | Agents keep working |
| 1:30 to 2:00 | Review queue | Wave continues |
| 2:00 | Panel. Start long-running agents before it | Agents keep working |
| 2:30 to 3:30 | Merge, connect the flow, test on phone at the live URL | 7, then fixes |
| **3:30** | **Checkpoint:** full path on the live URL? If not, apply the cut order | Accessibility and polish |
| 4:30 | **Feature freeze.** Rehearse, record backup video | Demo-breaker fixes only |
| 5:15 | Submit | |

## Review checklist (every PR)

- Touches only files the brief owns, or explains why.
- `npm run build` and `npm test` pass in CI.
- No attendee text in URLs, logs or spans. Bodies read with `readLimitedJson`.
- Model output is validated in code; session lists come from IDs that exist in the agenda.
- Errors show a clear message, never an empty "no results".
- Scott can explain the change. Ask the agent for a walkthrough if not.
- AI routes tested on the live URL after merge, because previews don't have secrets.

## Cut order (from the spec, top goes first)

Networking slide, Dash0 beyond basic traces, nudges, room highlight, community tags, service worker (keep `localStorage`). **Never cut:** interview to explained plan, case for attending, check-in re-plan, readout, basic agent, floor image with text directions, organizer view, basic accessibility. If Elastic is failing at 1:00, keep the agenda fallback and drop the Elastic track.
