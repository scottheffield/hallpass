# Hallpass review rules

Flag any change that breaks one of these. Each rule comes from the product spec.

## Privacy and telemetry

- Attendee text (goals, answers, notes, chat, access needs) must travel in POST bodies, never in URLs or query strings. Traces record URLs.
- No attendee text in `console.*` logs, error messages, span attributes or metric labels. Log status codes and IDs only.
- The organizer insights route returns aggregates only: no individual rows, notes, chat text or access needs.

## Request handling

- Request bodies are read with `readLimitedText` or `readLimitedJson` from `worker/lib/http.ts`, never an unbounded `request.json()` or `request.text()`.
- Every `/api/*` route except health requires a valid attendee ID header and goes through the rate limiter.
- Model calls need a token cap, a timeout and a soft failure path.

## Data and model output

- Elastic is called only from the Worker, never from `src/`.
- Model output is untrusted. No `dangerouslySetInnerHTML`, no raw HTML rendering, and links must be `http` or `https`.
- Session lists and IDs come from retrieved data and are checked against the agenda in code, never parsed from model text.
- Stored Claude message history is returned unchanged. Editing earlier turns can invalidate thinking blocks.
- Times are stored as ISO strings with an offset. Clash checks compare parsed times, not strings.
- Shapes in `shared/types.ts` change only in small, separate PRs.

## Accessibility baseline

- Interactive elements are keyboard reachable, labeled, and keep a visible focus style.
- Directions are plain text a screen reader can read in order. The floor image is supplementary and has alt text.
