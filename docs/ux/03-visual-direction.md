# Hallpass — visual direction for review

Three static design concepts applying one proposed visual system to the approved Entry, Today, and Plan adjustment structure. No application code or production design system is included. Session content is illustrative.

[Open the three-screen visual proposal](hallpass-visual-direction-v1.png). The exact generation prompt is saved in `visual-direction-generation-prompt.txt`.

Visual inspection: all three screens and their actions are legible without clipped text. The generated image introduces slight tonal variation in buttons and the wordmark; implementation intent is flat color. Remove the redundant “Tuesday” in the Today header when the full date is already beneath it. Phone-width wrapping and interactive states remain implementation checks, not capabilities demonstrated by this image.

## Direction

A calm conference companion: warm white surfaces, deep ink-blue text, dark teal actions, and pale sage supporting information. Humanist sans typography keeps short conversations approachable and schedules readable. The signature is aligned time-and-session information, repeated across the plan, Today, and proposed changes.

The interface should feel useful in a crowded venue and clear in a narrated video. Familiar controls and an obvious primary action take precedence over expressive decoration. No mascot, confetti, gamified progress, glass, gradients, or terminal styling.

## Three screens

- **Entry:** open composition, “Why are you here?” immediately before Hallpass, a substantial free-text field, and visible direct and exploratory paths. No duplicated wordmark or onboarding navigation.
- **Today:** next-session hierarchy, distinct time and room, a brief goal-linked reason, directions as the primary action, and a visible planned break. Secondary help stays quiet.
- **Plan adjustment:** feedback acknowledgment, aligned current/proposed comparison, evidence for the recommendation, and explicit Apply / Keep choices. This is a focused view with a clear Close action.

## Proposed palette and typography

| Role | Proposed value |
| --- | --- |
| Main surface | Warm white, #FAF9F5 |
| Primary text | Ink navy, #18323D |
| Primary actions and selection | Dark teal, #24665E |
| Supporting surface | Pale sage, #E5EFEB |
| Secondary text | Slate, #52646B |
| UI type direction | Humanist sans, Source Sans 3 or equivalent; exact font selection follows approval |

These are proposed intent values, not measured properties of the generated raster. Actual font rendering, contrast, keyboard focus, responsive layout, and large-text behavior must be verified during implementation. Color never carries a state on its own.

## Interaction intent for the handoff

- Keep input, buttons, and labels comfortable at phone width; use at least 44px interaction targets, preferably 48px for primary controls.
- Show a clear focus ring and keep all controls labeled. Labels remain visible when inputs contain text.
- Preserve user input and scroll position across back navigation.
- Use one brief confirmation when a plan change succeeds. Do not animate the schedule in a way that makes the attendee chase moving content.
- Reduced motion removes decorative transitions. Loading uses an honest text status rather than a fake percentage or simulated typing delay.
- State views reuse the same hierarchy: offline status does not displace directions; a failed adjustment leaves the original plan readable.
- On wide screens, cap reading width instead of stretching phone content across the viewport. Desktop organizer insights can use a broader grid later.

## Review scope

Review whether the direction feels welcoming, clear, and credible, and whether the next action is obvious on each screen. Approval is for the visual language and hierarchy, not unverified session claims or exact raster pixels. After review, extend it across the full journey and document the selected components and states for builders.

The image is a design proposal produced with the built-in image-generation tool. It is not a working or accessibility-tested interface.
