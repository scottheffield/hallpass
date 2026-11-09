# Brief 00: Phase 0 seams

**Run:** locally, by Scott with Claude Code, before any cloud agent. **Time box:** 35 minutes.

Do the checklist in [BUILD-PLAN.md, Phase 0](../BUILD-PLAN.md#phase-0-seams-1130-to-about-1205-local-one-pr). The goal is boundaries, not features: every later slice should be able to build without editing a shared file.

## Rules for this PR

- Stubs return fixture data plus `"stub": true`, so the UI can be built against them.
- `worker/lib/claude.ts` gets one real smoke call behind `GET /api/health?deep=1`, returning `{ claude: "ok" | "error" }` with no output text.
- The in-memory store is per isolate. That's fine for dev; say so in a comment.
- No visual design. Plain Tailwind in `src/ui/` primitives.

## Done when

- `npm run build`, `npm test` pass. CI is green.
- `npm run dev` shows every view with fixture data, tabs work, `?demo=1` shows the demo bar and moves the clock.
- Each route in the API table returns a stub, not 501.
- Deployed. `/api/health` on the live URL shows Claude and Elastic configured.
