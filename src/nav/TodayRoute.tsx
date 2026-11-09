import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LeaveSessionResponse, PlanResponse } from "../../shared/api";
import type { Plan, Session } from "../../shared/types";
import { getSession, loadAgenda } from "../lib/agenda";
import { ApiFailure, post } from "../lib/api";
import { TodayScreen } from "../screens/today";
import { useConferenceNow } from "../screens/today/useConferenceNow";
import { formatTimeRange } from "../screens/today/timeline";
import { Button, Notice, Sheet, Stack } from "../ui";
import { findCheckInOffer } from "./checkInOffer";
import type { CheckInTarget, DirectionsTarget } from "./types";

export interface TodayRouteProps {
  /** Bumped after every completed check-in flow so plan + offer refresh. */
  planVersion: number;
  planUpdated: boolean;
  onDismissPlanUpdate: () => void;
  onDirections: (target: DirectionsTarget) => void;
  onOpenCheckIn: (target: CheckInTarget) => void;
  onBreak: () => void;
  onAsk?: () => void;
  onBuildPlan?: () => void;
  onPlanRefresh: () => void;
}

async function fetchPlan(): Promise<Plan | null> {
  const response = await post<PlanResponse>("/api/plan/get", {});
  return response.plan;
}

export function TodayRoute({
  planVersion,
  planUpdated,
  onDismissPlanUpdate,
  onDirections,
  onOpenCheckIn,
  onBreak,
  onAsk,
  onBuildPlan,
  onPlanRefresh,
}: TodayRouteProps) {
  const now = useConferenceNow();
  const planFetchRef = useRef(0);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveFollowUp, setLeaveFollowUp] = useState<CheckInTarget | null>(null);

  useEffect(() => {
    const token = ++planFetchRef.current;
    let cancelled = false;

    (async () => {
      try {
        const [loadedPlan, agenda] = await Promise.all([fetchPlan(), loadAgenda()]);
        if (cancelled || token !== planFetchRef.current) return;
        setPlan(loadedPlan);
        setSessions(agenda.sessions);
      } catch {
        if (cancelled || token !== planFetchRef.current) return;
        setPlan(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planVersion]);

  const checkInOffer = useMemo(
    () => findCheckInOffer(now, plan, sessions),
    [now, plan, sessions],
  );

  const onDirectionsById = useCallback(
    async (sessionId: string) => {
      try {
        const agenda = await loadAgenda();
        const session = getSession(agenda.sessions, sessionId);
        if (!session) return;
        onDirections({
          sessionId,
          sessionTitle: session.title,
          sessionTime: formatTimeRange(session.start, session.end),
          roomName: session.room,
        });
      } catch {
        // Today already surfaces load errors; skip broken navigation.
      }
    },
    [onDirections],
  );

  const handleLeaveSession = useCallback(
    async (sessionId: string) => {
      setLeaveBusy(true);
      setLeaveError(null);
      try {
        await post<LeaveSessionResponse>("/api/session/leave", { session_id: sessionId });
        const session = getSession(sessions, sessionId);
        if (session) {
          setLeaveFollowUp({
            sessionId,
            sessionTitle: session.title,
            sessionTime: formatTimeRange(session.start, session.end),
            sessionRoom: session.room,
            leftEarly: true,
          });
        }
        onPlanRefresh();
      } catch (err) {
        setLeaveError(err instanceof ApiFailure ? err.message : "Could not leave that session. Try again.");
      } finally {
        setLeaveBusy(false);
      }
    },
    [onPlanRefresh, sessions],
  );

  return (
    <>
      {checkInOffer ? (
        <div className="mb-4">
          <Button variant="secondary" onClick={() => onOpenCheckIn(checkInOffer)}>
            Check in: {checkInOffer.sessionTitle}
          </Button>
        </div>
      ) : null}
      {leaveError ? (
        <div className="mb-4">
          <Notice tone="error" title="Could not leave session">
            <p>{leaveError}</p>
          </Notice>
        </div>
      ) : null}
      <TodayScreen
        key={planVersion}
        planUpdated={planUpdated}
        onDismissPlanUpdate={onDismissPlanUpdate}
        onDirections={(sessionId) => void onDirectionsById(sessionId)}
        onBreak={onBreak}
        onAsk={onAsk}
        onBuildPlan={onBuildPlan}
        onLeaveSession={(sessionId) => void handleLeaveSession(sessionId)}
        leaveSessionBusy={leaveBusy}
      />
      <Sheet
        open={leaveFollowUp !== null}
        title="You left the session"
        onClose={() => setLeaveFollowUp(null)}
      >
        {leaveFollowUp ? (
          <Stack gap="md">
            <p className="text-sm text-muted">
              Optional feedback helps Hallpass adjust the rest of your day. You can also skip and see what is next on
              Today.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                const target = leaveFollowUp;
                setLeaveFollowUp(null);
                onOpenCheckIn(target);
              }}
            >
              Give feedback
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setLeaveFollowUp(null);
                onPlanRefresh();
              }}
            >
              Skip
            </Button>
          </Stack>
        ) : null}
      </Sheet>
    </>
  );
}
