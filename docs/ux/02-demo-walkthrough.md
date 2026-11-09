# Hallpass — end-to-end wireframe walkthrough

Review draft. No application code. This supersedes the SRE scenario and shorter check-in proposal in the first UX exploration. Visual styling is deferred; this pass specifies structure, copy, behavior, and the video path.

## What we are proving

Hallpass remembers why someone came, uses that purpose to explain choices, responds when a session misses the mark, and gives an honest account of the conference. The POC needs a complete connected journey, not exhaustive settings and administration.

Demo attendee: a first-timer interested in practical platform engineering and AI inference, with medium energy and a preference to avoid vendor pitches. Sample sessions and feedback in the wireframes are illustrative, not claims about the real agenda. The implementation and recording must replace them with verified agenda items and supported reasons.

## Wireframe board

The accompanying grayscale board shows eight numbered screens. The direct path is 01 → 03 → 04 → 05 → 06 → 07 → 08. Screen 02 demonstrates optional exploration. It is a static review artifact, not a clickable prototype.

[Open the wireframe board](hallpass-wireframes-v1.png). Generated with the built-in image-generation tool; the generation prompt is saved in `wireframe-generation-prompt.txt`.

Visual review notes: the board is readable and shows all eight states. In the next revision, remove the duplicate Hallpass label on the entry screen and move “Make the case for attending” outside the second session card so it clearly applies to the entire plan. The readout's deployment question is conditional sample content, not a fact inferred from the initial answer; use “Not enough feedback” unless supporting feedback is supplied. The behavioral notes below govern these details.

### 01 — Start your way

“Why are you here?” immediately precedes Hallpass. One question: “What would make this trip worth it?”

Prepared answer: “Practical platform engineering and AI inference. Skip vendor pitches. Leave room for breaks.”

**Make my plan** opens an editable interpretation; **Help me think it through** starts a guided conversation. The latter also works with no initial answer. Do not require a mode selection before the person can begin. Do not re-ask details already supplied.

### 02 — Optional exploration

“What would you like to bring back?” with choices “An approach to try,” “A clearer technical decision,” and “A better understanding,” plus free text. Follow-ups reflect earlier answers. Continue submits a selected answer; selection alone does not move the screen.

**Use what I've shared** opens the summary at any point. Back preserves answers. Bound system-led questioning; allow the user to ask for more exploration. No fake typing delays, reward animations, repeated praise, or forced humor. Engagement comes from useful recognition and easier decisions.

### 03 — Confirm the goal

Separate the two goals from planning preferences. Each goal is editable. Show inferred wording for correction before generating. Preferences include balanced pacing and avoidance of vendor pitches. If balanced pacing is a default rather than the attendee's explicit answer, identify it as a suggested starting point.

Optional access preferences remain reachable here, without being a required conversation. **Build my plan** starts generation. Actual status stages might be “Finding relevant sessions” and “Checking overlaps”; do not manufacture percentages. Show the first day when it is ready, with later days visibly pending if needed.

### 04 — An explained plan

Day selector, chronological sessions, breaks, and a short goal-linked reason per pick. The board shows a viewport excerpt; the complete demo day must contain at least three picks, one explicit comparison, and one resolved clash, as required by the product spec.

**Why this over the alternative?** opens session details with the recommended and competing items, their conflicting times, and the actual tradeoff. Use their abstracts as evidence. Avoid claiming that a session provides hands-on exercises unless its source says so.

**Make the case for attending** opens an editable draft with the goals, real planned session names, and intended takeaways. Primary action: Copy. It is a short optional branch, not a required stage for a registered attendee.

### 05 — Know what's next

One dominant action: **Get directions**. Show the next session, time, room, and relevance. Keep the following break visible so pace feels deliberate. **I need a break** and **Ask Hallpass** remain secondary.

Directions show destination and known starting landmark, then readable text instructions and a floor image. No invented live location or unverified step-free claim. Back returns to the same session. Demo time is labeled in a separate demo control area; never mix time advancement with attendee navigation.

### 06 — A useful check-in

Retain both questions from the product spec for this POC: “Worth your time?” and “Moved your platform goal forward?” Each has three choices. Optional note: “Too introductory. I need concrete examples.”

The board uses Mixed and A little, followed by Save. That is three taps without a note, an explicit tradeoff against the original two-tap target: an explicit Save prevents accidental submission while editing a note. Do not quietly remove a rating or auto-submit before the person can add context. This remains a reviewable interaction choice.

Offer “I didn't attend.” Do not infer attendance from the clock or treat absent feedback as a negative rating. Save feedback independently of whether a useful replacement is found.

### 07 — Review the adjustment

Show current and proposed session, time implications, and a concise source-supported reason. For this example, an overview becomes an implementation workshop. Only claim that other sessions and breaks remain unchanged if they do.

**Apply change** updates the plan; **Keep my plan** dismisses the suggestion without discarding the check-in. Confirmation reads “Plan updated” with Undo, then returns to Today. This approval step is the working design assumption, not an approved rewrite of the product spec.

If no better session exists, say so; do not stage a false improvement. On failure, retain the current plan and saved feedback. On slow generation, show a quiet pending message; never block directions.

### 08 — See what you gained

Readout uses the original goals and recorded feedback. Separate “Some progress,” “No reported progress,” and “Not enough feedback.” An unresolved AI deployment question should appear only if the attendee actually supplied that question or feedback; otherwise say that evidence is insufficient.

“Based on your check-ins” makes the evidence boundary visible. Helpful sessions link to their feedback. Follow-ups are labeled suggestions. **Review team recap** opens an editable summary before copying. No scores, goal-completion theater, or invented learning claims.

## Supporting surfaces outside the main board

| Surface | Minimum useful design | Video treatment |
| --- | --- | --- |
| Case for attending | Editable problem / planned sessions / intended takeaways, with Copy | Brief glance after the plan |
| Session comparison | Recommended and conflicting alternative, goal fit, reasons, Keep / Swap | Show one explicit tradeoff |
| Directions | Destination, starting landmark, ordered text route, floor image | Briefly open from Today |
| Ask Hallpass | Labeled entry, short contextual answers, explicit Close | Show available; use for directions if the working demo supports it |
| Organizer insights | Goal themes, reported goal movement, gaps, sample size and coverage; seeded demo label | Short closing view |
| Offline | Cached plan/directions, freshness, queued feedback acknowledgment | Required POC behavior; omit from main video if time is tight |

The manager case and organizer insights are part of the full story, not replacements for attendee value. Organizer insights never expose individual notes or access preferences. No settings suite, account screens, notification center, or separate admin workflow is needed for this demonstration.

## Narrated video — target 2:45

| Time | Screen/action | Narration intent |
| --- | --- | --- |
| 0:00–0:15 | Opening question and name | Condense Scott's HIMSS story: the schedule never asked why he was there. Say “Why are you here?” immediately before Hallpass |
| 0:15–0:35 | 01, brief glimpse of 02, then 03 | Direct when you know your goals; help exploring when you don't. Same summary, no repeated intake |
| 0:35–1:00 | 04 plus comparison and manager case | Explain one pick and a resolved clash. Show planned breaks and briefly show how the same goals support approval |
| 1:00–1:15 | Labeled time jump, 05 and directions | One clear next step, readable route, quiet support |
| 1:15–1:55 | 06 → 07 → updated Today | Feedback changes a recommendation for an understandable reason; attendee remains in control |
| 1:55–2:20 | Labeled later time, 08 and recap | Show progress and a genuine remaining gap, then the useful next step to bring home |
| 2:20–2:35 | Organizer insights | Aggregate goal outcomes, clearly labeled prepared demo data |
| 2:35–2:45 | Close | “A conference is a product, and attendees are its users. Hallpass helps you get what you came for.” |

This leaves fifteen seconds below the three-minute ceiling. Do not add introductory slides that consume the interaction time. Keep a phone-width app large within the video frame; crop away browser clutter, move the pointer deliberately, and use captions. Hosting is a submission requirement, not a service selection in this design pass. Verify the final share link plays without the judge needing access approval.

If waits are edited out, disclose the cut rather than implying instant generation. Demo-time jumps are visible. Sponsor claims appear only for capabilities actually working in the POC. The recording is evidence of the product, not a substitute for implementing the shown behavior.

## Review checks

- Can a focused person submit one detailed answer without being forced into conversation?
- Can someone uncertain explore without pressure to finish or start over?
- Can the viewer explain why a session was selected and what changed after feedback?
- Are breaks, text input, and readable directions demonstrated through actual behavior?
- Can the viewer distinguish a recommendation from a commitment, and missing evidence from failure?
- Are supporting screens reachable without adding complexity to the primary path?

Next review: structure and behavior on the wireframe board. Color, typography, brand identity, and polished component design follow that review.
