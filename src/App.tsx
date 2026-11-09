import { useState } from "react";
import { EVENT_TIME_ZONE } from "../shared/event";
import type { IsoDateTime } from "../shared/types";
import { demoNowForRequests, isDemoMode } from "./lib/clock";
import {
  AppFrame,
  Button,
  Choice,
  DemoBarSlot,
  Field,
  Notice,
  Sheet,
  Stack,
  type AppTab,
} from "./ui";
import { AdjustPreview, EntryPreview, ILLUSTRATIVE_ANSWER, StubPreview, TodayPreview } from "./ui/preview-screens";

function formatDemoTime(iso: IsoDateTime): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(iso));
}

type Place = "entry" | "today" | "adjust" | "plan" | "goals";
type Overlay = "explore" | "directions" | "break" | "ask" | null;

/**
 * App frame only: tabs, page column, and slots.
 * Entry, Today, and plan adjustment are illustrative compositions.
 * Demo mode (`?demo=1`, wired in main) can show a quiet clock label in the frame slot.
 */
export default function App() {
  const [place, setPlace] = useState<Place>("entry");
  const [tab, setTab] = useState<AppTab>("today");
  const [answer, setAnswer] = useState(ILLUSTRATIVE_ANSWER);
  const [updated, setUpdated] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [breakChoice, setBreakChoice] = useState("");
  const [ask, setAsk] = useState("");

  function showToday() {
    setTab("today");
    setPlace("today");
    setOverlay(null);
  }

  function onTabChange(next: AppTab) {
    setTab(next);
    setPlace(next);
  }

  const showTabs = place !== "entry" && place !== "adjust";
  const demoNow = demoNowForRequests();
  const demoBar =
    isDemoMode() && demoNow ? <DemoBarSlot timeLabel={formatDemoTime(demoNow)} /> : undefined;

  return (
    <AppFrame tab={tab} onTabChange={onTabChange} showTabs={showTabs} demoBar={demoBar}>
      {place === "entry" ? (
        <EntryPreview
          answer={answer}
          onAnswer={setAnswer}
          onMakePlan={showToday}
          onExplore={() => setOverlay("explore")}
        />
      ) : null}
      {place === "today" ? (
        <TodayPreview
          updated={updated}
          onUndo={() => setUpdated(false)}
          onDirections={() => setOverlay("directions")}
          onChangeSession={() => setPlace("adjust")}
          onBreak={() => setOverlay("break")}
          onAsk={() => setOverlay("ask")}
        />
      ) : null}
      {place === "adjust" ? (
        <AdjustPreview
          onClose={() => setPlace("today")}
          onApply={() => {
            setUpdated(true);
            setPlace("today");
          }}
          onKeep={() => {
            setUpdated(false);
            setPlace("today");
          }}
        />
      ) : null}
      {place === "plan" ? <StubPreview which="plan" /> : null}
      {place === "goals" ? <StubPreview which="goals" /> : null}

      <Sheet open={overlay === "explore"} title="Help me think it through" onClose={() => setOverlay(null)}>
        <Stack>
          <Notice tone="info" title="Start from what you already wrote">
            A guided conversation is not part of this shell. You can make a plan from your answer, or go back and
            change it.
          </Notice>
          <Button
            variant="primary"
            onClick={() => {
              showToday();
            }}
          >
            Make my plan
          </Button>
        </Stack>
      </Sheet>

      <Sheet open={overlay === "directions"} title="Directions" onClose={() => setOverlay(null)}>
        <Notice tone="stub" title="Directions aren't in this shell">
          Room A is illustrative. No route is shown, and this preview does not know where you are.
        </Notice>
      </Sheet>

      <Sheet open={overlay === "break"} title="I need a break" onClose={() => setOverlay(null)}>
        <Choice
          legend="How long?"
          name="break-length"
          value={breakChoice}
          onChange={setBreakChoice}
          hint="Illustrative. Choosing a duration does not change a plan."
          options={[
            { value: "15", label: "15 minutes", description: "A short pause." },
            { value: "30", label: "30 minutes", description: "Room to breathe." },
            { value: "rest", label: "Rest of today", description: "Leave the rest of the day open." },
          ]}
        />
      </Sheet>

      <Sheet open={overlay === "ask"} title="Ask Hallpass" onClose={() => setOverlay(null)}>
        <Field
          label="What do you need?"
          name="ask"
          value={ask}
          onChange={setAsk}
          hint="Illustrative. This stays on the page and is not sent."
        />
      </Sheet>
    </AppFrame>
  );
}
