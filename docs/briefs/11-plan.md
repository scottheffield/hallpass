# Brief 11: Plan generation

**Owns:** `worker/routes/plan.ts`, `worker/plan/`, `src/views/PlanView.tsx`.
**Routes:** `POST /api/plan`, `POST /api/plan/get`, `POST /api/plan/edit`. Implements `generateDay` and `replanDay` in `worker/plan/index.ts` (check-in calls `replanDay`; keep its signature).

## Pipeline (per day)

1. **Candidates:** `searchSessions` with each goal against `search_text`, `expertise_to_see` against `speaker_text`, and exact match of `people_to_see` against `speakers` in code (strong pick). Merge, dedupe, cap at 30 to 60, drop `all_access` entries, drop sessions already planned on other days.
2. **Model:** `claudeJson` with the profile, candidates (ID, title, time, room, track, first 600 chars of abstract, and which field matched) and pacing. Returns picks with `reason`, optional `beat_alternative`, `clash_note`, and breaks.
3. **Enforce in code** (`worker/plan/validate.ts`): every ID exists in the candidates, no overlaps, pinned items kept, break count fits pacing (packed 0 to 1, balanced 2, light 3+). Drop invalid picks.
4. **Repair once:** if fewer than 3 valid picks remain, re-ask once with the errors. Then fall back.
5. **Fallback** (`worker/plan/basic.ts`): greedy pick by search score with no overlaps, template reasons ("Matches your goal: …"), `source: "basic"`, shown as "basic plan (AI unavailable)".

Generate the first conference day on save. Other days generate when opened.

## Honest reasons

Each reason names one goal in plain words and draws on the abstract. Say whether the topic or the speaker matched. Don't claim outcomes the abstract doesn't state. A bio describes the person, not the talk.

## `replanDay(profile, plan, day, from, signal)`

Re-plan only items after `from` on that day, keep pinned and done items, and use the check-in signal (a "no" on moved_goal steers away from that topic). Return the new day; check-in builds the diff.

## Plan view

Timeline grouped by day, each item with time, room, title (from the agenda) and reason. Tap opens why it beat the alternative and the clash note. Pin, drop, swap. "Plan generating" state with honest progress (target under 10 seconds perceived).

## Tests

`validate.ts` (overlaps, unknown IDs, pinned kept, pacing breaks) and `basic.ts`.

## Done when

The demo persona's first day shows at least 3 picks, one "picked over X because Y" and one resolved clash, on the live URL, from real agenda data.

## Follow-up: tight transfers (added after the plan slice merged in PR #6)

A small PR against `worker/plan/validate.ts`, with tests. It depends on `shared/venue.ts` from the brief 21 follow-up, step 1, and uses `transferMinutes` from it, so the plan and Directions show the same walking times.

- A gap between consecutive picks is tight when it's shorter than `transferMinutes(from.room, to.room)`. Pacing `light` doubles the minimum.
- When a gap is tight, prefer a candidate in a closer room. If the pick stays, add a `clash_note` that uses the same minutes Directions will show, for example "Tight change: the Hyatt Regency is about 12 minutes from 255 BC, and you have 10."
- Unknown and off-site rooms count as long transfers (see `transferMinutes`), so they're flagged rather than silently allowed.
