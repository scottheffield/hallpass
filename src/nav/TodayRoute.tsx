import { useCallback, useEffect, useState } from "react";
import type { PlanResponse } from "../../shared/api";
import type { Plan } from "../../shared/types";
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
  const [checkInOffer, setCheckInOffer] = useState<CheckInTarget | null>(null);

  const refreshOffer = useCallback(async () => {
    try {
      const [plan, agenda] = await Promise.all([fetchPlan(), loadAgenda()]);
      setCheckInOffer(findCheckInOffer(now, plan, agenda.sessions));
    } catch {
      setCheckInOffer(null);
    }
  }, [now]);

  useEffect(() => {
    void refreshOffer();
  }, [refreshOffer, planUpdated]);

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
