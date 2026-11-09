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

### Step 1: shared venue helpers (own small PR, first)

Directions, the plan and the corner agent must agree on rooms and walking times, so the rules live in one file: `shared/venue.ts`, with tests.

- `parseRoom(name)` returns `{ building, level, room, kind }`, where `kind` is `"salt-palace"`, `"hyatt"`, `"off-site"` or `"unknown"`.
  - Split on `|`. The first part is the building, the second the level, and the rest is the room, joined with " › ". Some names have more than three parts, such as `Salt Palace | Level 1 | Solutions Showcase | Hall 1 | Alpine Overlook Zone | Demo Theater`.
  - Names without `|`: `Hyatt Regency Lobby` is building Hyatt Regency, level unknown. `Off-Site Location` is off-site. Anything else is unknown, with the raw name as the room.
- `transferMinutes(from, to)` is the single table both slices use: same room 0, same building and level 5, same building with a different level 8, different building 12, off-site 30. Unknown level within the same building counts as a level change. An unknown room on either side counts as a different building, so the estimate errs long.

### Step 2: Directions screen (`src/screens/directions/`)

1. **Building and level first.** Show one heading line from `parseRoom`, for example "Salt Palace › Level 2 › 255 BC", above the landmark and walking hint. If the name doesn't parse, show it as is.
2. **Directions from the previous room.** Pass the previous room on today's plan (the last `done` or past item by the clock) and show one line above the walking hint, built from `parseRoom` and `transferMinutes`:
   - Same room: "Same room. Stay put."
   - Same building and level: "Same floor. Follow signs to {room}."
   - Same building, different level: "Go to {level} by the escalators or a marked elevator, then follow signs to {room}."
   - Different building: "Next door in the {target building}, through the indoor connection. Allow about {minutes} minutes." Name the target building, so this works from the Hyatt to the Salt Palace too.
   - Off-site or unknown: "This room is away from the main venue. Check the session listing and allow extra time."

   With no previous room (the first session of the day), skip this line.
3. **Walking hint.** Show it unchanged under the from-line. Most rooms have no hint yet (24 of 34), and the lookup already shows its fallback text for those, so the screen always has a route sentence.
4. **Which floor plan.** Show the Salt Palace plan only for rooms whose `kind` is `"salt-palace"`. For Hyatt, off-site and unknown rooms, say "This room isn't on the Salt Palace floor plan" and rely on the text.
5. **Floor images instead of the PDF.** Once Data adds per-level images (brief 01 follow-up), show the image for the room's level inline, with alt text naming the level and the room's landmark, and tap to open full size. Keep the PDF link as a last resort. Room pins are should-ship and first to cut.

Tests: `parseRoom` on three-part names, longer Solutions Showcase names, `Hyatt Regency Lobby` and `Off-Site Location`. Every branch of the from-line, including Salt Palace to Hyatt and Hyatt to Salt Palace. No Salt Palace plan for Hyatt, off-site or unknown rooms.
