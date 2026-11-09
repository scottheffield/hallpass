# Brief 02: UX shell

**Owns:** `src/ui/`, `src/index.css`, and the layout in `src/App.tsx` (tabs, page frame). Not views.
**Read:** [docs/ux/01-flows-and-wireframes.md](../ux/01-flows-and-wireframes.md), `PRODUCT.md`.

Other agents are building views with `src/ui/` primitives right now. **Keep every primitive's props unchanged.** Restyle internals and add new primitives if needed, but don't rename or remove.

## Build

- Design tokens in `src/index.css` with Tailwind `@theme`: color, type scale, spacing, radius. Light and dark, both with readable contrast (WCAG AA as a target, not a claim).
- Primitives: `Screen` (heading, back), `Stack`, `Button` (primary, secondary, quiet), `Field`, `TextArea`, `Choice` (radio cards), `Sheet` (bottom sheet, focus trapped, returns focus on close), `Notice` (info, offline, error, stub).
- Add `SessionCard` (title, time, room, reason line) and `ChangeList` (1 to 3 bullets) to `src/ui/`. Views will adopt them.
- App frame: mobile-first, max width on desktop, Today / Plan / Goals tabs at the bottom, Ask Hallpass entry, demo bar slot.
- States: loading, empty, offline, error, stub. One consistent look for each.

## Tone

Quiet, plain, calm. "Why are you here?" appears right before the Hallpass name on the first screen. No mascot, no gradients that hurt contrast, no color-only state.

## Done when

All views look consistent at 375px and 1280px, keyboard focus is visible everywhere, and no view's code changed.
