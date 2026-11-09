# Brief 21: Corner agent and directions

**Owns:** `worker/routes/agent.ts`, `worker/agent/`, `src/components/AskHallpass.tsx`, `src/views/DirectionsView.tsx`.
**Route:** `POST /api/agent` (SSE).
**Uses:** `public/rooms.json` and `public/floor/` from Data.

## Directions view

Text route first: room, level, landmark, `walking_hint`, and `step_free_hint` when the profile's access needs mention step-free and the hint exists. Then the floor image with alt text. Heading order works for a screen reader. Works offline (static files).

## Corner agent

- Collapsed "Ask Hallpass" button on attendee views. Opens a sheet with a short chat. Closes on Escape and returns focus.
- Server packs context into the system prompt: clock time, today's remaining plan items (title, time, room, reason), the next session's room hint, and the profile's goals. No tool loop.
- `claudeStream`, max 10 messages, 1,000 chars each, 400 output tokens. Stream text to the browser over SSE; render as text only.
- Stays in conference scope and politely declines other tasks. If unsure, says what it doesn't know. Never invents rooms or sessions.
- Tone: "Next: 251 A-C at 2:15. East escalators from Hall DE." Not "Great question!"
- Offline or error: "I need a network connection to answer. Your plan and directions still work."

## Tests

Context builder (correct next item by clock, room hint lookup), message limits.

## Done when

On the live URL it answers one plan question and one "how do I get to room R" question from live plan data, and Directions works for every room on the demo plan.

## Follow-up: wayfinding (added after the Directions screen merged in PR #11)

Small PRs against `src/screens/directions/`. Pure logic goes in `lookup.ts` with tests.

1. **Building and level first.** Room names have the form `Building | Level | Room` (for example `Salt Palace | Level 2 | 255 BC`). Parse them in code and show one heading line, "Salt Palace › Level 2 › 255 BC", above the landmark and walking hint. Fall back to the raw name if it doesn't parse.
2. **Directions from where you are.** The screen already takes `startingLandmark`. Instead, pass the previous room on today's plan (the last `done` or past item by the clock) and compare the two rooms in code:
   - Same room: "Same room. Stay put."
   - Same building, same level: "Same floor. Follow signs to 255 EF."
   - Same building, different level: "Go to Level 2 by the escalators or a marked elevator, then follow signs to 255 BC."
   - Different building: "Next door in the Hyatt Regency, through the indoor connection. Allow about 10 minutes."

   Show this line above the walking hint. Keep the walking hint unchanged, since it starts from the 200 South entrance. With no previous room (first session of the day), show the walking hint alone. The agent's directions answers use the same function.
3. **Second building.** The Salt Palace floor plan does not cover the Hyatt Regency. For Hyatt rooms, don't link the Salt Palace plan. Say "This room is in the Hyatt Regency, which isn't on the Salt Palace floor plan" and rely on the text route.
4. **Floor images instead of the PDF.** Once Data adds per-level images (brief 01 follow-up), show the image for the room's level inline, with alt text naming the level and the room's landmark, and tap to open full size. Keep the PDF link as a last resort. Room pins (`x`, `y` percentages on that image) are a should-ship item and first to cut.

Tests: parsing room names, every branch of the from-to line, Hyatt rooms skip the Salt Palace plan.
