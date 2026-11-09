import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfileResponse } from "../shared/api";
import type { Profile } from "../shared/types";
import { AskHallpass } from "./components/AskHallpass";
import { DemoBar } from "./components/DemoBar";
import { post } from "./lib/api";
import { demoNowForRequests, isDemoMode } from "./lib/clock";
import { CheckInScreen } from "./screens/checkin";
import { CaseScreen } from "./screens/case";
import { InsightsScreen } from "./screens/insights";
import { ReadoutScreen } from "./screens/readout";
import {
  DirectionsRoute,
  PlanRoute,
  ShellUtilityLinks,
  TodayRoute,
  pickHomeShell,
  showShellTabs,
  tabToPlace,
  type CheckInTarget,
  type DirectionsTarget,
  type ShellPlace,
} from "./nav";
import { GoalsView } from "./views/GoalsView";
import { IntakeFlow } from "./views/IntakeFlow";
import { AppFrame, Button, Choice, Sheet, type AppTab } from "./ui";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [place, setPlace] = useState<ShellPlace>("entry");
  const [tab, setTab] = useState<AppTab>("today");
  const [planUpdated, setPlanUpdated] = useState(false);
  const [planVersion, setPlanVersion] = useState(0);
  const [directions, setDirections] = useState<DirectionsTarget | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInTarget | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [breakChoice, setBreakChoice] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [auxReturn, setAuxReturn] = useState<ShellPlace>("today");
  const checkInOpenerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await post<ProfileResponse>("/api/profile/get", {});
        if (!cancelled && res.profile) {
          const nowIso = demoNowForRequests();
          const now = nowIso ? new Date(nowIso) : new Date();
          const home = pickHomeShell(now, res.profile);
          setProfile(res.profile);
          setTab(home.tab);
          setPlace(home.place);
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

  const enterApp = useCallback(() => {
    void (async () => {
      try {
        const res = await post<ProfileResponse>("/api/profile/get", {});
        if (res.profile) setProfile(res.profile);
      } catch {
        /* Profile refresh is best-effort after intake. */
      }
      setTab("plan");
      setPlace("plan");
    })();
  }, []);

  function onTabChange(next: AppTab) {
    setTab(next);
    setPlace(tabToPlace(next));
    setDirections(null);
    setAskOpen(false);
  }

  function openFocusedScreen(nextPlace: ShellPlace) {
    setAuxReturn(tabToPlace(tab));
    setPlace(nextPlace);
    setAskOpen(false);
  }

  function closeFocusedScreen() {
    setPlace(auxReturn);
    setAskOpen(false);
  }

  function openDirections(target: DirectionsTarget) {
    setDirections(target);
    setAuxReturn(tabToPlace(tab));
    setPlace("directions");
  }

  function closeDirections() {
    setDirections(null);
    setPlace(auxReturn);
  }

  function openCheckIn(target: CheckInTarget) {
    const active = document.activeElement;
    checkInOpenerRef.current = active instanceof HTMLElement ? active : null;
    setCheckIn(target);
    setCheckInOpen(true);
  }

  function closeCheckIn() {
    setCheckInOpen(false);
  }

  const showTabs = showShellTabs(place);
  const showAsk = showTabs;
  const demoBar = isDemoMode() ? <DemoBar /> : undefined;
  const askTrigger = showAsk ? (
    <Button type="button" variant="quiet" onClick={() => setAskOpen(true)}>
      Ask Hallpass
    </Button>
  ) : undefined;

  if (booting) {
    return (
      <AppFrame tab={tab} onTabChange={onTabChange} showTabs={false} demoBar={demoBar}>
        <p className="text-sm text-muted">Loading…</p>
      </AppFrame>
    );
  }

  return (
    <AppFrame
      tab={tab}
      onTabChange={onTabChange}
      showTabs={showTabs}
      demoBar={demoBar}
      ask={askTrigger}
    >
      {place === "entry" ? <IntakeFlow onFinished={enterApp} /> : null}

      {place === "today" ? (
        <>
          <TodayRoute
            planVersion={planVersion}
            planUpdated={planUpdated}
            onUndoPlanUpdate={() => setPlanUpdated(false)}
            onDirections={openDirections}
            onOpenCheckIn={openCheckIn}
            onBreak={() => setBreakOpen(true)}
            onAsk={() => setAskOpen(true)}
            onBuildPlan={() => {
              setTab("plan");
              setPlace("plan");
            }}
          />
          <ShellUtilityLinks
            onReadout={() => openFocusedScreen("readout")}
            onInsights={() => openFocusedScreen("insights")}
          />
        </>
      ) : null}

      {place === "directions" && directions ? (
        <DirectionsRoute
          target={directions}
          accessNeeds={profile?.access_needs}
          planVersion={planVersion}
          onBack={closeDirections}
        />
      ) : null}

      {place === "plan" ? (
        <>
          <PlanRoute
            onGoals={() => {
              setTab("goals");
              setPlace("goals");
            }}
            onCase={() => openFocusedScreen("case")}
          />
          <ShellUtilityLinks
            onReadout={() => openFocusedScreen("readout")}
            onInsights={() => openFocusedScreen("insights")}
          />
        </>
      ) : null}

      {place === "goals" ? (
        <>
          <GoalsView />
          <ShellUtilityLinks
            onReadout={() => openFocusedScreen("readout")}
            onInsights={() => openFocusedScreen("insights")}
          />
        </>
      ) : null}

      {place === "case" ? <CaseScreen onBack={closeFocusedScreen} /> : null}
      {place === "readout" ? <ReadoutScreen onBack={closeFocusedScreen} /> : null}
      {place === "insights" ? <InsightsScreen onBack={closeFocusedScreen} /> : null}

      {showAsk ? <AskHallpass open={askOpen} onClose={() => setAskOpen(false)} /> : null}

      {checkIn ? (
        <CheckInScreen
          open={checkInOpen}
          sessionId={checkIn.sessionId}
          sessionTitle={checkIn.sessionTitle}
          sessionTime={checkIn.sessionTime}
          sessionRoom={checkIn.sessionRoom}
          returnFocusRef={checkInOpenerRef}
          onClose={closeCheckIn}
          onFinished={({ planUpdated: updated }) => {
            if (updated) setPlanUpdated(true);
            setPlanVersion((version) => version + 1);
            closeCheckIn();
          }}
        />
      ) : null}

      <Sheet open={breakOpen} title="I need a break" onClose={() => setBreakOpen(false)}>
        <Choice
          legend="How long?"
          name="break-length"
          value={breakChoice}
          onChange={setBreakChoice}
          hint="Plan updates for breaks arrive with the plan slice."
          options={[
            { value: "15", label: "15 minutes", description: "A short pause." },
            { value: "30", label: "30 minutes", description: "Room to breathe." },
            { value: "rest", label: "Rest of today", description: "Leave the rest of the day open." },
          ]}
        />
      </Sheet>
    </AppFrame>
  );
}
