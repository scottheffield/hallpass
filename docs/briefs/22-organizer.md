# Brief 22: Organizer insights

**Owns:** `worker/routes/insights.ts`, `worker/insights/`, `scripts/seed-demo-attendees.mjs`, `src/views/InsightsView.tsx`.
**Route:** `GET /api/insights`.

## Seed

`scripts/seed-demo-attendees.mjs` (run with `node --env-file=.dev.vars`): 30 fictional attendees with IDs `seed_001` to `seed_030`, profiles with `goal_themes`, plans from real agenda IDs, 2 to 6 check-ins each, and readouts with `gap_themes`. Deterministic (fixed random seed) so reruns match. No real names.

## Insights

Elastic aggregations only, computed server side:

- `n_attendees`
- `top_goals`: terms on `goal_themes`
- `sessions_moving_goals`: per session, share of check-ins with `moved_goal` yes or a little, minimum 3 check-ins, top 10, with titles joined from the agenda
- `gaps`: terms on `gap_themes`
- `break_demand`: count of profiles with pacing `light` or breaks requested

Never return notes, access needs, attendee IDs or individual rows. Suppress any bucket with fewer than 3 attendees.

Fallback without Elastic: compute from the seed fixture in memory, labeled.

## View

Desktop-friendly single screen: four plain sections with counts and short bars (text values always visible, no color-only meaning). Reached from the demo bar. Heading: "What attendees came for, and what helped."

## Tests

Small-bucket suppression, moved-goal rate.

## Done when

The Insights view on the live URL shows all four sections from seeded data, with no individual rows.
