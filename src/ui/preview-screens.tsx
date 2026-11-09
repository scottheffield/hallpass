import { EVENT_CITY, INTAKE } from "../../shared/event";
import { HelloMark } from "./HelloMark";
import { Button } from "./Button";
import { ChangeList } from "./ChangeList";
import { Notice } from "./Notice";
import { Screen } from "./Screen";
import { SessionCard } from "./SessionCard";
import { Stack } from "./Stack";
import { TextArea } from "./TextArea";

/** Fixture copy from the v3 board. Not a conference agenda. */
export const ILLUSTRATIVE_ANSWER =
  "Practical platform engineering and AI inference. Skip vendor pitches. Leave room for breaks.";

const PREVIEW_NOTE = "Illustrative preview. Nothing is saved.";

export function EntryPreview({
  answer,
  onAnswer,
  onMakePlan,
  onExplore,
}: {
  answer: string;
  onAnswer: (value: string) => void;
  onMakePlan: () => void;
  onExplore: () => void;
}) {
  return (
    <Screen heading="Why are you here?" headingSize="md" kicker="KubeCon 2026" kickerDetail={EVENT_CITY}>
      <Stack gap="lg">
        <HelloMark />
        <TextArea
          label={INTAKE.purpose.prompt}
          labelAppearance="title"
          name="purpose"
          value={answer}
          onChange={onAnswer}
          rows={4}
          placeholder="For example: solve a work problem, learn a topic, find a community."
          hint="Illustrative example. Edit it, or clear it and write your own."
        />
        <Stack gap="sm">
          <Button variant="primary" onClick={onMakePlan}>
            Make my plan
            <span aria-hidden="true">→</span>
          </Button>
          <Button variant="secondary" onClick={onExplore}>
            Help me think it through
          </Button>
          <p className="text-center text-sm text-muted">Start directly, or explore together.</p>
          <p className="text-center text-sm text-muted">{PREVIEW_NOTE}</p>
        </Stack>
      </Stack>
    </Screen>
  );
}

export function TodayPreview({
  updated,
  onUndo,
  onDirections,
  onChangeSession,
  onBreak,
  onAsk,
}: {
  updated: boolean;
  onUndo: () => void;
  onDirections: () => void;
  onChangeSession: () => void;
  onBreak: () => void;
  onAsk: () => void;
}) {
  return (
    <Screen brand heading="Next, at 10:00" headerEnd={<span>Tue, Nov 10</span>}>
      <Stack>
        <p className="text-sm text-muted">Illustrative session data. Not the conference agenda.</p>
        {updated ? (
          <Notice tone="info" title="Plan updated">
            <p>The 14:00 overview would become Platform implementation workshop. Nothing was saved.</p>
            <div className="mt-2">
              <Button variant="quiet" onClick={onUndo}>
                Undo
              </Button>
            </div>
          </Notice>
        ) : null}
        <SessionCard
          title="Platform patterns in practice"
          time="10:00–10:40"
          room="Room A"
          reasonLabel="For your platform goal"
          reason="Compare approaches you could try with your team."
        />
        <Button variant="primary" onClick={onDirections}>
          Get directions
          <span aria-hidden="true">→</span>
        </Button>
        <div className="flex justify-center">
          <Button variant="quiet" onClick={onChangeSession}>
            Change session
          </Button>
        </div>
        <SessionCard
          kind="break"
          title="Room to breathe"
          time="10:40"
          detail="A 30-minute break before your next session."
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="quiet" onClick={onBreak}>
            I need a break
          </Button>
          <Button variant="quiet" onClick={onAsk}>
            Ask Hallpass
          </Button>
        </div>
      </Stack>
    </Screen>
  );
}

export function AdjustPreview({
  onClose,
  onApply,
  onKeep,
}: {
  onClose: () => void;
  onApply: () => void;
  onKeep: () => void;
}) {
  return (
    <Screen
      brand
      heading="A better fit for your afternoon"
      lead={
        <Stack gap="sm">
          <p className="text-sm text-muted">Illustrative preview of a plan adjustment. Nothing is saved.</p>
          <p className="flex items-center gap-2 font-semibold text-ink">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 text-action">
              <circle cx="9" cy="9" r="8" fill="currentColor" />
              <path d="M5 9.2 7.6 11.8 13 6.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Check-in saved
          </p>
        </Stack>
      }
      headerEnd={
        <Button variant="quiet" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Stack>
        <p>You wanted more concrete examples.</p>
        <SessionCard kind="current" title="Platform overview" time="14:00" />
        <p className="text-center text-sm font-semibold text-muted" aria-hidden="true">
          ↓
        </p>
        <p className="sr-only">Suggested replacement</p>
        <SessionCard kind="suggested" title="Platform implementation workshop" time="14:00" />
        <h2 id="why-this-fits" className="font-display text-xl font-semibold text-ink">
          Why this fits
        </h2>
        <ChangeList
          labelId="why-this-fits"
          items={[
            "Its abstract describes implementation examples.",
            "Your other sessions and breaks stay.",
          ]}
        />
        <Button variant="primary" onClick={onApply}>
          Apply change
        </Button>
        <Button variant="secondary" onClick={onKeep}>
          Keep my plan
        </Button>
      </Stack>
    </Screen>
  );
}

export function StubPreview({ which }: { which: "plan" | "goals" }) {
  if (which === "plan") {
    return (
      <Screen heading="Plan">
        <Notice tone="stub" title="The plan view isn't in this shell">
          Day-by-day sessions belong to the plan slice. This tab is only the frame.
        </Notice>
      </Screen>
    );
  }

  return (
    <Screen heading="Goals">
      <Notice tone="empty" title="No goals in this shell">
        Saved goals are not built here. The entry screen still asks why you are here.
      </Notice>
    </Screen>
  );
}
