import { useCallback, useEffect, useState } from "react";
import type { ProfileResponse } from "../shared/api";
import { EVENT_TIME_ZONE } from "../shared/event";
import type { IsoDateTime, Profile } from "../shared/types";
import { post } from "./lib/api";
import { demoNowForRequests, isDemoMode } from "./lib/clock";
import { CheckInScreen } from "./screens/checkin";
import {
  DirectionsRoute,
  PlanTabStub,
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
import { AppFrame, Choice, DemoBarSlot, Sheet, type AppTab } from "./ui";

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

// Future overlays (not on main): ask → AskHallpass component; insights → separate route

export default function App() {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [place, setPlace] = useState<ShellPlace>("entry");
  const [tab, setTab] = useState<AppTab>("today");
  const [planUpdated, setPlanUpdated] = useState(false);
  const [directions, setDirections] = useState<DirectionsTarget | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInTarget | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [breakChoice, setBreakChoice] = useState("");

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
      let nextProfile = profile;
      try {
        const res = await post<ProfileResponse>("/api/profile/get", {});
        if (res.profile) {
          nextProfile = res.profile;
          setProfile(res.profile);
        }
      } catch {
        /* Profile refresh is best-effort after intake. */
      }
      const nowIso = demoNowForRequests();
      const now = nowIso ? new Date(nowIso) : new Date();
      const home = pickHomeShell(now, nextProfile);
      setTab(home.tab);
      setPlace(home.place);
    })();
  }, [profile]);

  function onTabChange(next: AppTab) {
    setTab(next);
    setPlace(tabToPlace(next));
    setDirections(null);
  }

  function openDirections(target: DirectionsTarget) {
    setDirections(target);
    setPlace("directions");
  }

  function closeDirections() {
    setDirections(null);
    setPlace("today");
    setTab("today");
  }

  function openCheckIn(target: CheckInTarget) {
    setCheckIn(target);
    setCheckInOpen(true);
  }

  function closeCheckIn() {
    setCheckInOpen(false);
  }

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
    <AppFrame tab={tab} onTabChange={onTabChange} showTabs={showShellTabs(place)} demoBar={demoBar}>
      {place === "entry" ? <IntakeFlow onFinished={enterApp} /> : null}

      {place === "today" ? (
        <TodayRoute
          planUpdated={planUpdated}
          onUndoPlanUpdate={() => setPlanUpdated(false)}
          onDirections={openDirections}
          onOpenCheckIn={openCheckIn}
          onBreak={() => setBreakOpen(true)}
        />
      ) : null}

      {place === "directions" && directions ? (
        <DirectionsRoute
          target={directions}
          accessNeeds={profile?.access_needs}
          onBack={closeDirections}
        />
      ) : null}

      {place === "plan" ? <PlanTabStub /> : null}
      {place === "goals" ? <GoalsView /> : null}

      {checkIn ? (
        <CheckInScreen
          open={checkInOpen}
          sessionId={checkIn.sessionId}
          sessionTitle={checkIn.sessionTitle}
          sessionTime={checkIn.sessionTime}
          sessionRoom={checkIn.sessionRoom}
          onClose={closeCheckIn}
          onFinished={({ planUpdated: updated }) => {
            if (updated) setPlanUpdated(true);
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
