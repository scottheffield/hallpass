# Rules for coding agents

You are building one slice of Hallpass. Read [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md) and your brief in [docs/briefs/](docs/briefs/) before writing code.

## Before you start

- Work from the latest `main`. Read the files your brief names, plus `shared/types.ts`, `shared/api.ts` and `shared/event.ts`. If `main` doesn't match your brief, follow `main` and say so in the PR.
- Run `npm ci`. Don't add dependencies. If you truly need one, stop and ask in the PR.
- Set your own `ELASTIC_INDEX_PREFIX` in `.dev.vars` (for example `hallpass-intake`) if you write test data. Never write to `hallpass-sessions`.

## While you work

- **Edit only the files your brief owns.** Changes to `shared/*`, `worker/index.ts`, `worker/lib/*`, `wrangler.jsonc` or `package.json` go in a separate small PR, opened first, that says why.
- Build against the contracts in `shared/api.ts`. Don't change a shape to suit your slice.
- Use `src/ui/` primitives for UI. Don't add design tokens or global CSS.
- Use `worker/lib/claude.ts` for model calls, `worker/lib/store.ts` for storage, `worker/lib/clock.ts` for time, and `worker/lib/agenda.ts` for sessions. Don't call `fetch` to Anthropic or Elastic directly.
- Your slice must work when Elastic or Claude is not configured: fall back, label the fallback, and never return an empty result for a failure.
- Stop processes by exact PID. On Windows, check the port is free before trusting a test run.

## Non-negotiable rules

- Attendee text (goals, notes, questions) goes in POST bodies, never URLs.
- Read request bodies with `readLimitedJson`, never `request.json()`.
- No attendee text, model output or request bodies in logs or spans. Log status codes, counts and timings.
- Model output is untrusted. Validate it in code, render it as text (no raw HTML), and build session lists from IDs that exist in the agenda.
- Times are ISO 8601 with offset (`-07:00` for the conference).
- The organizer view gets aggregates only. Never notes, access needs or individual rows.
- Voice is never required. Every control has a text label and works by keyboard.
- Agent tone: short sentences, specific rooms and times, no hype, no "Great question!".

## Before you open the PR

- `npm run build` and `npm test` pass.
- Add `vitest` tests for any pure logic you wrote (validation, rules, diffs, counts).
- PR description: what it does, files touched, how you tested, anything you couldn't test (AI and Elastic calls on previews lack secrets), and anything in your brief you didn't do.
- One slice, one branch, one PR. Keep it reviewable.
