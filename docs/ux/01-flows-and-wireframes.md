# Hallpass — UX review draft

Earlier exploration. For the current demo persona, retained two-question check-in, visual board, and video sequence, see [02-demo-walkthrough.md](02-demo-walkthrough.md). Decisions explicitly corrected there supersede this draft.

Low-fidelity structure and behavior, not a visual design specification. All attendee details, session names, times, and outcomes below are illustrative; they are not verified KubeCon schedule entries.

## The person and the task

Alex is an SRE attending KubeCon for the first time. Their team loses time diagnosing Kubernetes incidents. Alex wants useful approaches to take back, but cannot judge hundreds of abstracts and worries about missing something better.

Success: Alex can recognize their own problem in the plan, explain why the next session is worth attending, take a break without feeling behind, and bring home a truthful account of what they learned and still need to investigate.

## Proposed departures from the spec

| Spec choice | Proposed experience | Reason |
| --- | --- | --- |
| Re-plan after every check-in | Save feedback immediately; propose material changes for review | Feedback must not silently rearrange commitments |
| No menu; automatic view selection | A context-sensitive home plus stable Today / Plan / Goals destinations during the event | Automatic routing should not make familiar content disappear |
| Two questions about the session | Goal movement first; optional explanation; validate whether worth-it adds distinct signal | Two overlapping ratings may be more work than insight |
| Corner agent everywhere | A labeled “Ask Hallpass” entry, secondary to direct actions | Directions, swaps, and breaks should not require composing a prompt |

The check-in change affects the spec's two-answer requirement and organizer metrics. Until approved, retain both questions in one compact sheet; the alternative is shown below.

Confirmed correction: intake supports direct input and optional exploration. The user wants it easy and engaging, without being corny, and without requiring a conversation. The earlier mandatory three-step form and mandatory conversational sequence are withdrawn. A focused attendee can give one useful answer and proceed; an exploratory attendee can develop their goals with Hallpass. Six to eight exchanges bounds a guided sequence, not the minimum effort or a forced end to user-requested exploration.

## Journey

Before conference:

Direct path: Opening answer → Editable summary with visible planning defaults → Build plan → Plan

Exploration path: Opening question → “Help me think it through” → Relevant follow-ups → Editable summary → Build plan → Plan

Both paths use the same draft goals. Users can switch at any point without restarting. “Use what I've shared” ends exploration and opens the summary.

From Plan: review a session / swap / reserve a break / open “Make the case for attending.” The manager case is an optional branch, never an obstacle for someone already registered.

During conference:

Today → Next session → Directions → Return to Today

Today → Optional check-in → Feedback saved → Suggested change → Accept or keep plan

Today → Need a break → Choose duration → Preview affected items → Update plan

At any point: Plan gives schedule control; Goals gives the original purpose and “so far” evidence. After the conference, home becomes the readout, with the plan still reachable.

## 1. Entry and purpose

```text
┌──────────────────────────────────────┐
│ KubeCon · Conference planning        │
│                                      │
│ Why are you here?                    │
│ Hallpass                            │
│                                      │
│ Build a conference plan around       │
│ what you want to take home.          │
│                                      │
│ What would make this trip worth it?  │
│ ┌──────────────────────────────────┐ │
│ │ We spend too long finding the    │ │
│ │ cause of Kubernetes incidents.   │ │
│ └──────────────────────────────────┘ │
│ For example: solve a work problem,   │
│ learn a topic, find a community.     │
│                                      │
│ [ Make my plan                     ] │
│ [Help me think it through]          │
│ You can change your answers later   │
└──────────────────────────────────────┘
```

One substantive question on entry; no welcome screen or mode-selection gate that only adds a tap. “Make my plan” takes the current answer to a brief editable summary before generation. “Help me think it through” starts exploration using anything already entered; it also works with a blank answer. Examples help people begin; they do not preselect an answer. Preserve input when moving back.

Do not force follow-up questions when a direct answer already supports a useful plan. For example: “I'm an SRE using Kubernetes. I want practical incident troubleshooting, no introductory sessions, and breaks between talks” supplies purpose, context, depth, and pace in one turn. Extract those details and show the interpretation for correction.

On the direct path, expose unspecified pacing as a changeable default in the summary, not as an attendee-stated preference. Leave access needs unknown and offer an optional edit; never assume that someone has none. If input is too vague to support personalized picks, offer one focused clarification or a clearly labeled broad starting plan. Do not claim precise personalization from insufficient information.

When the attendee chooses exploration, follow with one question that uses their answer. For example, after Alex mentions diagnosing Kubernetes incidents: “Where do you get stuck most often?” Offer “Finding the cause,” “Knowing what to try next,” and “Something else,” alongside free text. Choices are starting points, never exhaustive categories.

Reflect the answer only when it adds value: “I'll look for practical troubleshooting sessions.” Then ask for work context only if it is still missing. Do not ask again for a role, tool, or goal already given. Optional topics, people, and communities can follow when relevant; allow “Not sure” and Skip without penalty.

Finish with “How much room would you like between sessions?” and relaxed / balanced / full choices explained in plain language. Optional “Access and comfort preferences” expands inline. Do not infer a disability from a pacing choice. Use “One last thing: your pace” only when it really is the final question.

### Conversation wireframe and tone

```text
┌──────────────────────────────────────┐
│ Hallpass                  [Go back] │
│                                      │
│ You: We spend too long finding      │
│ the cause of Kubernetes incidents. │
│                                      │
│ Where do you get stuck most often? │
│                                      │
│ [Finding the cause]                 │
│ [Knowing what to try next]          │
│ [Something else]                    │
│                                      │
│ Or tell us in your own words        │
│ [                                  ]│
│ [Continue]               [Not sure] │
│ [Use what I've shared]              │
└──────────────────────────────────────┘
```

Keep the current question and its answer controls prominent, with earlier answers available for review and editing. Selecting a choice does not unexpectedly advance the screen; Continue submits it. No fake typing delays, celebratory animations, streaks, or personality quizzes. Engagement comes from specific questions, low effort, and seeing how each answer improves the plan.

Voice example: “Would you rather go deeper on this, or leave room to explore?” Avoid “Let's crush your conference goals!” and repetitive “Great answer!” The summary is a useful payoff, not a theatrical reveal: “Here's what I heard,” followed by editable goals in the attendee's own language.

## 2. Confirm the interpretation

```text
┌──────────────────────────────────────┐
│ ‹ Back               Your goals     │
│                                      │
│ Here's what we'll plan around       │
│                                      │
│ Find practical ways to diagnose     │
│ Kubernetes incidents faster.        │
│ [Edit goal]           [Add a goal]   │
│                                      │
│ Context                     [Edit]  │
│ SRE · Kubernetes                    │
│                                      │
│ Pace                        [Edit]  │
│ Balanced · Leave room for breaks    │
│                                      │
│ We'll explain each recommendation. │
│ You can change any pick.            │
│                                      │
│ [ Build my plan                    ] │
└──────────────────────────────────────┘
```

Keep the summary faithful: do not turn “explore” into “choose a vendor,” or promise a measurable work improvement the attendee never specified. Support one to three goals without requiring three. Generation shows actual stages, not an invented percentage. Show the first day's plan when ready; make pending days explicit.

## 3. Plan: enough detail to trust, not enough to overwhelm

```text
┌──────────────────────────────────────┐
│ Your conference plan        [Goals] │
│ [Tue]     Wed     Thu               │
│                                      │
│ Focus: diagnosing incidents        │
│                                      │
│ 10:00–10:40                         │
│ Debugging distributed systems      │
│ Room A · 40 min                     │
│ Why: compares troubleshooting       │
│ approaches relevant to your goal.  │
│ [Details & alternatives]            │
│                                      │
│ 10:40–11:10 · Break                 │
│ Time to pause before your next talk│
│                                      │
│ 11:10–11:50                         │
│ Observability in practice          │
│ Room B                             │
│ [Details & alternatives]            │
│                                      │
│ [Make the case for attending]       │
│ Today         Plan          Goals  │
└──────────────────────────────────────┘
```

Session details disclose the abstract, goal match, competing pick, and tradeoff together. Actions: “Keep this session,” “Find another,” and “Remove.” Explain that keeping a session protects it from automatic replacement; do not rely on an unexplained pin icon.

Swapping presents at most a few relevant alternatives, including why each differs, and preserves the original until one is chosen. If there is no strong match, say so and offer open time rather than fabricate relevance. Longer titles wrap; room and time remain separate from the title.

## 4. Today: the most important screen

```text
┌──────────────────────────────────────┐
│ Tuesday, Nov 10          [My goals] │
│                                      │
│ Next · starts in 20 minutes         │
│ Debugging distributed systems      │
│ 10:00–10:40 · Room A                │
│                                      │
│ For your goal                      │
│ Explore approaches to diagnosing   │
│ incidents faster.                  │
│                                      │
│ [ Get directions                  ] │
│ [Change this session]               │
│                                      │
│ After this                         │
│ 10:40 · A 30-minute break           │
│                                      │
│ [I need a break]   [Ask Hallpass]    │
│ Today         Plan          Goals  │
└──────────────────────────────────────┘
```

One dominant action. No goal dashboard, ratings, or organizer metrics competing with getting to the room. When a session is underway, use “On your plan now,” not “You're attending”; the clock does not prove attendance. Show “I went” and “I skipped it” without making either mandatory.

Before the event, home instead says “Your plan is ready” and opens the plan. After today's last item, offer rest and tomorrow's preview. Avoid “You're done” if the attendee has other activities.

Directions open as a focused view with room, level, and text steps before the floor image. Ask for a known starting landmark when needed; never imply live location. If a step-free route is unverified, say it is unavailable and provide the venue's accessibility help when known. Back returns to the same session.

## 5. Check-in and changes are separate decisions

```text
┌──────────────────────────────────────┐
│ Quick check-in                 [×] │
│ Debugging distributed systems      │
│                                      │
│ Did this help with diagnosing      │
│ incidents?                         │
│ [Yes]       [A little]       [No]   │
│                                      │
│ Optional: what helped or was missing?│
│ [                                  ]│
│                                      │
│ [ Save check-in                    ] │
│ [I didn't attend]                   │
└──────────────────────────────────────┘

After saving, only if a useful change exists:

┌──────────────────────────────────────┐
│ Check-in saved                     │
│                                      │
│ A more practical session may help  │
│                                      │
│ Replace the 14:00 overview with     │
│ a troubleshooting workshop?        │
│ Its abstract describes exercises.  │
│ Your kept sessions stay unchanged. │
│                                      │
│ [Review change]    [Keep my plan]   │
└──────────────────────────────────────┘
```

This proposal uses a rating plus Save: two taps, with optional note. With multiple goals, show the goal this session was recommended for and allow “Another goal” before rating; never attribute the same answer to every goal. The spec-preserving variant adds “Was it worth your time?” before Save and costs an additional tap.

Do not pop up check-ins over directions. Offer them quietly on Today, allow dismissal, and avoid accumulating a backlog of nagging prompts. An unanswered check-in remains unknown. Saving does not depend on a successful re-plan.

Review change shows old → proposed item, time/room implications, and reason before “Apply change.” Include breaks and travel feasibility in conflict checks. Keep-session commitments are never silently removed. Confirm application and offer Undo.

“I need a break” offers 15 minutes / 30 minutes / rest of today, previews affected items, and lets Alex retain the existing plan. No warning colors or guilt language for missing a session.

## 6. Readout: evidence, gaps, and a useful handoff

```text
┌──────────────────────────────────────┐
│ Your conference, so far            │
│ Based on 3 check-ins               │
│                                      │
│ Diagnose incidents faster          │
│ Some progress                      │
│ You marked the debugging session   │
│ helpful for this goal.             │
│ [See your feedback]                │
│                                      │
│ Still open                         │
│ How these approaches fit your team │
│ has not been established.          │
│                                      │
│ Possible next step                 │
│ Review one recent incident with    │
│ your team using your session notes.│
│                                      │
│ [Review recap for my team]         │
│ Today         Plan          Goals  │
└──────────────────────────────────────┘
```

Distinguish attendee-reported progress, no reported progress, and insufficient feedback. Attendance alone never marks a goal achieved. Generated follow-ups are suggestions; do not assert a technique was learned unless feedback supports it. Let the attendee edit the recap before copying it. Personal access preferences and private notes stay out unless explicitly included by the attendee.

## Supporting surfaces

**Case for attending:** one editable plain-text draft covering the work problem, relevant planned sessions, and intended takeaways. Label planned outcomes as intentions. Primary action: Copy. No sending flow.

**Organizer insights:** separate desktop surface with arrival-goal themes, reported goal movement, common gaps, and break demand. Show sample size and feedback coverage beside each measure. “No feedback” must not become “no benefit.” Demo data stays labeled. Never expose attendee rows, notes, or access preferences. Minimum reporting group size is an open product decision.

**Ask Hallpass:** opens deliberately, preserves its conversation, and has an explicit close control. It can propose a plan edit but uses the same preview and approval path as other changes. Do not auto-close while someone is reading a response.

## Recovery and accessibility

| Situation | What the attendee sees and can do |
| --- | --- |
| Offline | Persistent, quiet status; last saved plan and directions remain usable; freshness timestamp visible |
| Offline check-in | “Saved on this device. We'll send it when you're online.” Replanning waits; retry must not duplicate the answer |
| Plan generation fails | Retain goals; offer Retry or a clearly labeled basic plan with honest matching reasons |
| No useful session match | Explain the gap and offer open time or broader alternatives; never manufacture a match |
| Missed session | Mark skipped, choose the next item, or find an alternative without restarting intake |
| No feedback | Readout says there is not enough feedback to assess the goal; offers optional reflection |
| Changed goals | Preview the effect on future items; preserve historical check-ins against their original goals |
| Large text / keyboard / screen reader | Logical heading order, wrapping content, text-labeled actions, visible focus, no color-only state, focus returned after overlays |

## Review and validation

Adaptive intake supporting direct input and optional exploration is confirmed. Review both entry paths and the proposed plan-change model next. Visual identity, colors, typography, and polished components come afterward.

Test the wireframes with a first-timer: can they describe what the plan is optimizing for, explain one recommendation, take a break without fearing lost choices, reject a proposed change, and distinguish an unassessed goal from an unmet goal? Observe hesitation and mistaken expectations rather than asking only whether they like the screens.

Open decisions for this review: accept preview-before-change; retain both check-in questions or test the shorter version. These are proposals, not changes to the source spec. Test whether a focused attendee can reach a useful plan without unnecessary questions, and whether an exploratory attendee can develop their goals without feeling rushed. Both should be able to change approach without losing their answers.
