# Brief 10: Intake (interview, profile, goals)

**Owns:** `worker/routes/interview.ts`, `worker/routes/profile.ts`, `worker/intake/`, `src/views/IntakeView.tsx`, `src/views/ConfirmView.tsx`, `src/views/GoalsView.tsx`.
**Routes:** `POST /api/interview`, `POST /api/profile`, `POST /api/profile/get`.
**Read:** UX draft sections 1 and 2, `shared/event.ts` for question wording.

## Flow

Three guided steps, one screen each, back preserves input:

1. **Purpose:** "What would make this trip worth it?" Free text, examples from `shared/event.ts`. "I'm still figuring it out" reveals starter goals to tap.
2. **Work:** role, plus optional problems, tools, people to see, kinds of experts.
3. **Pace:** relaxed / balanced / full (maps to `Pacing`), energy, breaks. Optional "Access and comfort preferences" expands inline.

Then `POST /api/interview` turns the answers into a `ProfileDraft`: `why_summary`, 1 to 3 `goals`, `problems`, `topics`, `tools`, `goal_themes` (only from the `shared/event.ts` list). If the purpose is too vague to plan, return one `clarify` question; ask it once, then proceed regardless.

**Confirm view:** "Here's what we'll plan around." Every field editable. Save calls `POST /api/profile`, then routes to plan generation.

**Goals view (tab):** shows the saved profile, editable. Editing says the plan for future days will use the new goals.

## Rules

- Server validates the draft: 1 to 3 goals, each under 200 chars, themes from the list only, enums valid. Repair or drop bad fields; never fail the whole intake on one bad field.
- If Claude fails, build a draft in code from the raw answers (purpose becomes the first goal) and show "AI unavailable, please check this summary."
- Don't infer disability from pacing. Access needs only from what the attendee typed.
- Keyboard can complete the whole flow. Labels on every field.

## Tests

Draft validation and repair, theme filtering.

## Done when

The demo persona completes intake in under 2 minutes on a phone, the profile saves to Elastic, and reloading the page shows it.
