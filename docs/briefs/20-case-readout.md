# Brief 20: Case for attending and readout

**Owns:** `worker/routes/case.ts`, `worker/routes/readout.ts`, `worker/summary/`, `src/views/CaseView.tsx`, `src/views/ReadoutView.tsx`.
**Routes:** `POST /api/case`, `POST /api/readout`.
**Build against fixtures** (`shared/fixtures/`) until intake, plan and check-in merge. Don't wait for them.

## Case for attending

From profile and plan: the problems you're bringing, the sessions that address them, what you'll bring back. `sessions` comes from plan IDs in code, never parsed from model text. `text` is plain, copyable, about 150 words, with no claims the plan doesn't support. "Copy" button. Opened from Plan as an optional branch.

## Readout

From profile, plan and check-ins: `goals_hit`, `goals_missed`, `helped_sessions` (from check-ins with `moved_goal` yes or a little, in code), `gaps`, `gap_themes` (from the `shared/event.ts` list only), `followups` (at least one, concrete).

- `final` is true only after the last planned block of the conference by the clock. Otherwise the heading says "so far".
- Missing feedback is not failure: say "Not enough feedback to tell" for a goal with no check-ins.
- Plain language, no scores or percentages.
- Fallback without Claude: build it in code from check-ins, labeled.
- Save to the readouts index (Insights reads `gap_themes`).

## Tests

Helped sessions from check-ins, `final` by clock, theme filtering.

## Done when

The demo attendee with 3 check-ins gets a readout naming goals hit and missed and one follow-up, and a case naming real sessions from the plan.
