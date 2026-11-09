import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlanResponse } from "../../shared/api";
import type { Plan, Session } from "../../shared/types";
import { getSession, loadAgenda } from "../lib/agenda";
import { post } from "../lib/api";
import { TodayScreen } from "../screens/today";
import { useConferenceNow } from "../screens/today/useConferenceNow";
import { formatTimeRange } from "../screens/today/timeline";
import { Button } from "../ui";
import { findCheckInOffer } from "./checkInOffer";
import type { CheckInTarget, DirectionsTarget } from "./types";

export interface TodayRouteProps {
  planUpdated: boolean;
  onUndoPlanUpdate: () => void;
  onDirections: (target: DirectionsTarget) => void;
  onOpenCheckIn: (target: CheckInTarget) => void;
  onBreak: () => void;
}

async function fetchPlan(): Promise<Plan | null> {
  const response = await post<PlanResponse>("/api/plan/get", {});
  return response.plan;
}

export function TodayRoute({
  planUpdated,
  onUndoPlanUpdate,
  onDirections,
  onOpenCheckIn,
  onBreak,
}: TodayRouteProps) {
  const now = useConferenceNow();
  const planFetchRef = useRef(0);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

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
  }, [planUpdated]);

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

  return (
    <>
      {checkInOffer ? (
        <div className="mb-4">
          <Button variant="secondary" onClick={() => onOpenCheckIn(checkInOffer)}>
            Check in: {checkInOffer.sessionTitle}
          </Button>
        </div>
      ) : null}
      <TodayScreen
        planUpdated={planUpdated}
        onUndoPlanUpdate={onUndoPlanUpdate}
        onDirections={(sessionId) => void onDirectionsById(sessionId)}
        onBreak={onBreak}
      />
    </>
  );
}
