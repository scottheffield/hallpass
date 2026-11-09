import { useEffect, useMemo, useState } from "react";
import type { PlanResponse } from "../../shared/api";
import type { IsoDateTime, Plan, Room, Session } from "../../shared/types";
import { getSession, loadAgenda } from "../lib/agenda";
import { post } from "../lib/api";
import { demoNowForRequests } from "../lib/clock";
import { DirectionsScreen, previousRoomForDirections } from "../screens/directions";
import { conferenceDateKey, parseInstant } from "../screens/today/timeline";
import { useConferenceNow } from "../screens/today/useConferenceNow";
import { Notice, Screen } from "../ui";
import { loadRooms } from "./loadRooms";
import type { DirectionsTarget } from "./types";

export interface DirectionsRouteProps {
  target: DirectionsTarget;
  accessNeeds?: string;
  onBack: () => void;
  backLabel?: string;
  /** Bumped after check-in so done sessions feed the from-line. */
  planVersion?: number;
}

async function fetchPlan(): Promise<Plan | null> {
  try {
    const response = await post<PlanResponse>("/api/plan/get", {});
    return response.plan;
  } catch {
    return null;
  }
}

export function DirectionsRoute({
  target,
  accessNeeds,
  onBack,
  backLabel,
  planVersion = 0,
}: DirectionsRouteProps) {
  const now = useConferenceNow();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const [loadedRooms, loadedPlan, agenda] = await Promise.all([
          loadRooms(),
          fetchPlan(),
          loadAgenda(),
        ]);
        if (cancelled) return;
        setRooms(loadedRooms);
        setPlan(loadedPlan);
        setSessions(agenda.sessions);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planVersion, target.sessionId]);

  const previousRoomName = useMemo(() => {
    if (!plan) return undefined;
    const session = getSession(sessions, target.sessionId);
    if (!session) return undefined;
    const startMs = parseInstant(session.start);
    if (!Number.isFinite(startMs)) return undefined;
    const dayKey = conferenceDateKey(new Date(startMs));
    const items = plan.days[dayKey]?.items ?? [];
    const nowIso: IsoDateTime = demoNowForRequests() ?? (now.toISOString() as IsoDateTime);
    return previousRoomForDirections(sessions, items, target.sessionId, nowIso);
  }, [plan, sessions, target.sessionId, now]);

  if (loading) {
    return (
      <Screen heading="Directions" brand onBack={onBack} backLabel={backLabel}>
        <Notice tone="loading" title="Loading floor info">
          <p>Pulling room hints.</p>
        </Notice>
      </Screen>
    );
  }

  return (
    <DirectionsScreen
      sessionTitle={target.sessionTitle}
      sessionTime={target.sessionTime}
      roomName={target.roomName}
      rooms={rooms}
      onBack={onBack}
      backLabel={backLabel}
      accessNeeds={accessNeeds}
      previousRoomName={previousRoomName}
    />
  );
}
