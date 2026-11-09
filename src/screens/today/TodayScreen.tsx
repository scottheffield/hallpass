import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlanResponse } from "../../../shared/api";
import type { Plan } from "../../../shared/types";
import { loadAgenda } from "../../lib/agenda";
import { ApiFailure, post } from "../../lib/api";
import { useConferenceNow } from "./useConferenceNow";
import { Button, Notice, Screen, SessionCard, Stack } from "../../ui";
import {
  breakDetail,
  breakTitle,
  buildDayTimeline,
  conferenceDateKey,
  formatHeaderDate,
  formatSessionRoom,
  formatTime,
  formatTimeRange,
  nextPlannedSession,
  resolveTodayHeading,
  restOfTodayTimeline,
  type TodayTimelineBlock,
} from "./timeline";
import { presentPlanReason } from "../plan/reason";
import { TODAY_PLAN_HEADING_ID, todaySessionStatusDetail } from "./accessibility";

export interface TodayScreenProps {
  onDirections?: (sessionId: string) => void;
  onChangeSession?: (sessionId: string) => void;
  onBreak?: () => void;
  onAsk?: () => void;
  planUpdated?: boolean;
  onDismissPlanUpdate?: () => void;
  onBuildPlan?: () => void;
}

async function fetchPlan(): Promise<Plan | null> {
  const response = await post<PlanResponse>("/api/plan/get", {});
  return response.plan;
}

function blockKey(block: TodayTimelineBlock, index: number): string {
  if (block.kind === "session") return `session-${block.session.id}`;
  return `break-${block.start}-${index}`;
}

export function TodayScreen({
  onDirections,
  onChangeSession,
  onBreak,
  onAsk,
  planUpdated = false,
  onDismissPlanUpdate,
  onBuildPlan,
}: TodayScreenProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof loadAgenda>>["sessions"]>([]);
  const [agendaSource, setAgendaSource] = useState<"agenda" | "fixture" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stub, setStub] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planResult, agenda] = await Promise.all([fetchPlan(), loadAgenda()]);
      setPlan(planResult);
      setSessions(agenda.sessions);
      setAgendaSource(agenda.source);
      setStub(false);
    } catch (err) {
      setPlan(null);
      if (err instanceof ApiFailure && err.status === 501) {
        setStub(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Could not load your plan.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const now = useConferenceNow();
  const dayKey = useMemo(() => conferenceDateKey(now), [now]);
  const headerDate = useMemo(() => formatHeaderDate(dayKey), [dayKey]);

  const dayPlan = plan?.days[dayKey];
  const timeline = useMemo(
    () => buildDayTimeline(sessions, dayPlan),
    [sessions, dayPlan],
  );

  const heading = useMemo(
    () => (plan ? resolveTodayHeading(dayKey, timeline, now.getTime(), plan, sessions) : null),
    [plan, dayKey, timeline, now, sessions],
  );

  const next = useMemo(() => nextPlannedSession(timeline, now.getTime()), [timeline, now]);
  const nextPresented = useMemo(
    () => (next ? presentPlanReason(next.block.item.reason) : null),
    [next],
  );
  const listTimeline = useMemo(
    () => restOfTodayTimeline(timeline, next),
    [timeline, next],
  );

  const screenHeading = useMemo(() => {
    if (!heading) return "Today";
    switch (heading.kind) {
      case "next":
      case "in-break":
        return heading.text;
      case "empty-day":
        return heading.text;
      case "off-event":
        return "Outside conference days";
      case "day-done":
        return heading.nextSessionTitle
          ? `Nothing else today`
          : "Conference plan complete";
      default:
        return "Today";
    }
  }, [heading]);

  return (
    <Screen
      brand
      heading={screenHeading}
      headerEnd={
        <time dateTime={dayKey} className="font-semibold text-muted">
          {headerDate}
        </time>
      }
    >
      <Stack>
        {loading ? (
          <Notice tone="loading" title="Loading your plan">
            <p>Pulling today&apos;s schedule.</p>
          </Notice>
        ) : null}

        {!loading && stub ? (
          <Notice tone="stub" title="Plan API is not wired here">
            <p>This preview cannot load a saved plan from the server.</p>
          </Notice>
        ) : null}

        {!loading && error ? (
          <Notice tone="error" title="Could not load plan">
            <p>{error}</p>
            <div className="mt-2">
              <Button variant="secondary" onClick={() => void reload()}>
                Try again
              </Button>
            </div>
          </Notice>
        ) : null}

        {!loading && !error && !stub && !plan ? (
          <Notice tone="empty" title="No plan yet">
            <p>Save a profile and build a plan before today&apos;s schedule can appear.</p>
            {onBuildPlan ? (
              <div className="mt-2">
                <Button variant="primary" onClick={onBuildPlan}>
                  Build my plan
                </Button>
              </div>
            ) : null}
          </Notice>
        ) : null}

        {!loading && !error && !stub && plan ? (
          <>
            {plan.source === "basic" ? (
              <p className="text-sm text-muted" role="status">
                Plan source: basic plan (AI unavailable).
              </p>
            ) : null}
            {agendaSource === "fixture" ? (
              <p className="text-sm text-muted" role="status">
                Agenda source: fallback fixture. Session details may be incomplete.
              </p>
            ) : null}

            {planUpdated ? (
              <Notice tone="info" title="Plan updated">
                <p>Your plan changed after the last check-in.</p>
                {onDismissPlanUpdate ? (
                  <div className="mt-2">
                    <Button variant="quiet" onClick={onDismissPlanUpdate}>
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </Notice>
            ) : null}

            {heading?.kind === "day-done" && heading.nextSessionTitle ? (
              <Notice tone="info" title="Tomorrow starts here">
                <p>
                  {formatHeaderDate(heading.nextDayKey ?? "")}: {heading.nextSessionTitle} at{" "}
                  {heading.nextSessionTime}.
                </p>
              </Notice>
            ) : null}

            {heading?.kind === "day-done" && !heading.nextSessionTitle ? (
              <Notice tone="info" title="Nothing left on your plan">
                <p>Your saved sessions for the conference are complete.</p>
              </Notice>
            ) : null}

            {next ? (
              <section aria-label="Next session">
                <SessionCard
                  title={next.block.session.title}
                  time={formatTimeRange(next.block.start, next.block.end)}
                  room={formatSessionRoom(next.block.session.room)}
                  reasonLabel={nextPresented?.reasonLabel ?? "Why it's on your plan"}
                  reason={nextPresented?.reason ?? next.block.item.reason}
                />
                {onDirections ? (
                  <Button variant="primary" onClick={() => onDirections(next.block.session.id)}>
                    Get directions
                    <span aria-hidden="true">→</span>
                  </Button>
                ) : null}
                {onChangeSession ? (
                  <div className="flex justify-center">
                    <Button variant="quiet" onClick={() => onChangeSession(next.block.session.id)}>
                      Change session
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section aria-labelledby={TODAY_PLAN_HEADING_ID}>
              <h2
                id={TODAY_PLAN_HEADING_ID}
                className="font-display text-lg font-semibold text-ink"
              >
                Today&apos;s plan
              </h2>
              <Stack gap="sm">
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted">No sessions or breaks on this day.</p>
                ) : null}
                {listTimeline.map((block, index) => {
                    if (block.kind === "break") {
                      return (
                        <SessionCard
                          key={blockKey(block, index)}
                          kind="break"
                          headingLevel={3}
                          title={breakTitle(block.planBreak.note)}
                          time={formatTime(block.start)}
                          detail={breakDetail(block.planBreak.note)}
                        />
                      );
                    }

                    const statusDetail = todaySessionStatusDetail(block.item);
                    const presentedReason = presentPlanReason(block.item.reason);

                    return (
                      <SessionCard
                        key={blockKey(block, index)}
                        headingLevel={3}
                        title={block.session.title}
                        time={formatTimeRange(block.start, block.end)}
                        room={formatSessionRoom(block.session.room)}
                        reasonLabel={
                          statusDetail ? undefined : (presentedReason.reasonLabel ?? "Why it's on your plan")
                        }
                        reason={statusDetail ? undefined : presentedReason.reason}
                        detail={statusDetail}
                      />
                    );
                  })}
              </Stack>
            </section>

            <nav aria-label="Today actions" className="flex flex-wrap items-center justify-between gap-2">
              {onBreak ? (
                <Button variant="quiet" onClick={onBreak}>
                  I need a break
                </Button>
              ) : null}
              {onAsk ? (
                <Button variant="quiet" onClick={onAsk}>
                  Ask Hallpass
                </Button>
              ) : null}
            </nav>
          </>
        ) : null}
      </Stack>
    </Screen>
  );
}
