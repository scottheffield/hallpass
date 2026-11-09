# Brief 12: Today and check-in

**Owns:** `worker/routes/checkin.ts`, `worker/checkin/`, `src/views/TodayView.tsx`, `src/views/CheckInView.tsx`.
**Routes:** `POST /api/checkin`, `POST /api/plan/apply`.
**Read:** UX draft sections 4 and 5.

## Today view (the most important screen)

- Uses the demo clock (`src/lib/clock.ts`). Shows the next planned session: title, time, room, the reason it's on the plan, and "How do I get there?" (opens Directions).
- After a session ends by the clock, or on "Mark done", offer the check-in. Not a modal that blocks the screen.
- Empty states: no plan yet (go to intake), nothing left today (show tomorrow's first item, or the readout after the last day).
- Off plan: a missed session can be marked skipped, with the next item shown.

## Check-in sheet

Two questions, one tap each: "Did it move your goal?" (yes / a little / no) and "Was it worth it?" (yes / mixed / no). Optional one-line note (max 280 chars). Submit.

## Server

1. Save the `CheckIn` with ID `${attendee_id}:${session_id}` (retry overwrites). Mark the plan item `done`.
2. Call `replanDay` for the rest of today with the signal.
3. Diff old and new day in code (`worker/checkin/diff.ts`) into 1 to 3 `PlanChange` bullets. If nothing changed, `proposal: null`.
4. Store the proposal as `plan.pending`. Return it.

`POST /api/plan/apply { proposal_id, accept }` applies or discards `plan.pending` and returns the plan.

UI shows "Feedback saved" immediately, then "Suggested change" with the bullets and **Accept** / **Keep my plan**.

If re-planning fails, the check-in still saves and the UI says the plan wasn't changed.

## Tests

`diff.ts`: added, removed, moved, break; cap at 3 bullets; no-change case.

## Done when

On the live URL in demo mode: advance the clock past a session, two taps re-plan the rest of the day, and the change summary shows.
