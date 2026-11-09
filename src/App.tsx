import { useEffect, useState } from "react";
import type { ProfileResponse } from "../shared/api";
import { EVENT_TIME_ZONE } from "../shared/event";
import type { IsoDateTime } from "../shared/types";
import { post } from "./lib/api";
import { demoNowForRequests, isDemoMode } from "./lib/clock";
import { AppFrame, Choice, DemoBarSlot, Field, Notice, Sheet, type AppTab } from "./ui";
import { AdjustPreview, StubPreview, TodayPreview } from "./ui/preview-screens";
import { GoalsView } from "./views/GoalsView";
import { IntakeFlow } from "./views/IntakeFlow";

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
type Overlay = "directions" | "break" | "ask" | null;

export default function App() {
  const [booting, setBooting] = useState(true);
  const [place, setPlace] = useState<Place>("entry");
  const [tab, setTab] = useState<AppTab>("today");
  const [updated, setUpdated] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [breakChoice, setBreakChoice] = useState("");
  const [ask, setAsk] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await post<ProfileResponse>("/api/profile/get", {});
        if (!cancelled && res.profile) {
          setPlace("today");
          setTab("today");
        }
      } catch {
        /* Stay on intake when the profile is missing or the request fails. */
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (booting) {
    return (
      <AppFrame tab={tab} onTabChange={onTabChange} showTabs={false} demoBar={demoBar}>
        <p className="text-sm text-muted">Loading…</p>
      </AppFrame>
    );
  }

  return (
    <AppFrame tab={tab} onTabChange={onTabChange} showTabs={showTabs} demoBar={demoBar}>
      {place === "entry" ? <IntakeFlow onFinished={showToday} /> : null}
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
      {place === "goals" ? <GoalsView /> : null}

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
