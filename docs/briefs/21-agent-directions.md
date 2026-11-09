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
