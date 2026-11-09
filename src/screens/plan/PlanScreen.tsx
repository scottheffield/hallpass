import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EVENT_DAYS } from "../../../shared/event";
import type {
  PlanAction,
  PlanDayRequest,
  PlanEditRequest,
  PlanEditResponse,
  PlanResponse,
  ProfileResponse,
} from "../../../shared/api";
import type { Plan, Profile, Session } from "../../../shared/types";
import { loadAgenda, getSession } from "../../lib/agenda";
import { ApiFailure, post } from "../../lib/api";
import {
  buildDayTimeline,
  breakDetail,
  breakTitle,
  formatTime,
  formatTimeRange,
  type TodaySessionBlock,
  type TodayTimelineBlock,
} from "../today/timeline";
import { Button, ChangeList, Notice, Screen, SessionCard, Sheet, Stack } from "../../ui";
import {
  dayTabLabel,
  seedAttemptedDaysFromPlan,
  shouldAutoGeneratePlanDay,
} from "./days";
import { sessionDetailBullets } from "./detail";
import { generationStageIndex, PLAN_GENERATION_STAGES } from "./generation";
import {
  dayTabFocusIndex,
  planDayPanelId,
  planDayTabId,
} from "./accessibility";
import { planFocusLine } from "./focus";
import { presentPlanReason } from "./reason";
import { planSessionStatusDetail } from "./statusLabel";

export interface PlanScreenProps {
  onGoals?: () => void;
  onCase?: () => void;
}

async function fetchPlan(): Promise<Plan | null> {
  const response = await post<PlanResponse>("/api/plan/get", {});
  return response.plan;
}

async function fetchProfile(): Promise<Profile | null> {
  const response = await post<ProfileResponse>("/api/profile/get", {});
  return response.profile;
}

function blockKey(block: TodayTimelineBlock, index: number): string {
  if (block.kind === "session") return `session-${block.session.id}`;
  return `break-${block.start}-${index}`;
}

export function PlanScreen({ onCase }: PlanScreenProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agendaSource, setAgendaSource] = useState<"agenda" | "fixture" | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(EVENT_DAYS[0]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStartedAt, setGenStartedAt] = useState<number | null>(null);
  const [genTick, setGenTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [stub, setStub] = useState(false);
  const [detail, setDetail] = useState<TodaySessionBlock | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const generatingRef = useRef(false);
  const attemptedDaysRef = useRef(new Set<string>());
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGenError(null);
    attemptedDaysRef.current = new Set();
    try {
      const [planResult, agenda, profileResult] = await Promise.all([
        fetchPlan(),
        loadAgenda(),
        fetchProfile(),
      ]);
      if (planResult) {
        attemptedDaysRef.current = seedAttemptedDaysFromPlan(planResult);
      }
      setPlan(planResult);
      setSessions(agenda.sessions);
      setAgendaSource(agenda.source);
      setProfile(profileResult);
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

  useEffect(() => {
    if (detail !== null) return;
    const trigger = detailTriggerRef.current;
    detailTriggerRef.current = null;
    if (!trigger?.isConnected) return;
    requestAnimationFrame(() => {
      trigger.focus();
    });
  }, [detail]);

  const generateDay = useCallback(
    async (day: string) => {
      if (stub || generatingRef.current) return;
      generatingRef.current = true;
      setGenerating(true);
      setGenError(null);
      setGenStartedAt(Date.now());
      setGenTick(0);
      try {
        const body: PlanDayRequest = { day };
        const response = await post<PlanResponse>("/api/plan", body);
        setPlan(response.plan);
      } catch (err) {
        if (err instanceof ApiFailure && err.status === 501) {
          setStub(true);
        } else {
          setGenError(err instanceof Error ? err.message : "Could not generate this day.");
        }
      } finally {
        generatingRef.current = false;
        setGenerating(false);
        setGenStartedAt(null);
      }
    },
    [stub],
  );

  useEffect(() => {
    const shouldGenerate = shouldAutoGeneratePlanDay({
      stub,
      loading,
      generating,
      genError,
      loadError: error,
      hasProfile: profile !== null,
      plan,
      selectedDay,
      attemptedDays: attemptedDaysRef.current,
    });
    if (!shouldGenerate) return;
    attemptedDaysRef.current.add(selectedDay);
    void generateDay(selectedDay);
  }, [plan, profile, selectedDay, stub, loading, generating, genError, error, generateDay]);

  useEffect(() => {
    if (!generating || genStartedAt === null) return;
    const id = window.setInterval(() => setGenTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [generating, genStartedAt]);

  const genStage = useMemo(() => {
    if (!generating || genStartedAt === null) return null;
    void genTick;
    return PLAN_GENERATION_STAGES[generationStageIndex(Date.now() - genStartedAt)];
  }, [generating, genStartedAt, genTick]);

  const focus = useMemo(() => planFocusLine(profile?.goals ?? []), [profile?.goals]);

  const dayPlan = plan?.days[selectedDay];
  const timeline = useMemo(
    () => buildDayTimeline(sessions, dayPlan),
    [sessions, dayPlan],
  );

  const detailBullets = useMemo(() => {
    if (!detail) return [];
    const altTitle = detail.item.beat_alternative
      ? getSession(sessions, detail.item.beat_alternative.session_id)?.title
      : undefined;
    return sessionDetailBullets(detail.item, altTitle);
  }, [detail, sessions]);

  function sessionBlock(sessionId: string, item: TodaySessionBlock["item"]): TodaySessionBlock | null {
    const session = getSession(sessions, sessionId);
    if (!session) return null;
    return {
      kind: "session",
      session,
      item,
      start: session.start,
      end: session.end,
    };
  }

  async function runEdit(sessionId: string, action: PlanAction) {
    setEditingId(sessionId);
    setEditError(null);
    setActionMessage(null);
    const body: PlanEditRequest = { day: selectedDay, session_id: sessionId, action };
    try {
      const response = await post<PlanEditResponse>("/api/plan/edit", body);
      attemptedDaysRef.current.add(selectedDay);
      setPlan(response.plan);
      const summary = response.changes
        .map((change) => change.text.trim())
        .filter((text) => text.length > 0)
        .join(" ");
      if (summary) setActionMessage(summary);
      if (action === "drop") {
        setDetail(null);
      } else if (detail) {
        const dayBody = response.plan.days[selectedDay];
        if (action === "swap") {
          const nextId =
            response.changes.find((change) => change.session_id && change.session_id !== sessionId)
              ?.session_id ?? sessionId;
          const item = dayBody?.items.find((row) => row.session_id === nextId);
          if (item) {
            const block = sessionBlock(nextId, item);
            if (block) setDetail(block);
          }
        } else {
          const item = dayBody?.items.find((row) => row.session_id === sessionId);
          if (item) {
            const block = sessionBlock(sessionId, item);
            if (block) setDetail(block);
          }
        }
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not update your plan.");
    } finally {
      setEditingId(null);
    }
  }

  const isEditing = editingId !== null;
  const detailPresented = detail ? presentPlanReason(detail.item.reason) : null;

  return (
    <>
      <Screen brand heading={loading ? "Your conference plan" : generating ? "Building your plan" : plan ? "Review your plan" : "Build your plan"}>
        <Stack>
          {loading ? (
            <Notice tone="loading" title="Loading your plan">
              <p>Pulling your schedule.</p>
            </Notice>
          ) : null}

          {!loading && stub ? (
            <Notice tone="stub" title="Plan API is not wired here">
              <p>This preview cannot load or edit a saved plan from the server.</p>
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

          {!loading && !error && !stub && !plan && !profile ? (
            <Notice tone="empty" title="No plan yet">
              <p>Save a profile and build a plan before sessions can appear here.</p>
            </Notice>
          ) : null}

          {!loading && !error && !stub && (plan || profile) ? (
            <>
              {plan?.source === "basic" ? (
                <p className="text-sm text-muted">basic plan (AI unavailable)</p>
              ) : null}
              {agendaSource === "fixture" ? (
                <p className="text-sm text-muted">
                  Agenda fallback in use. Session details may be incomplete.
                </p>
              ) : null}

              {actionMessage ? (
                <Notice tone="info" title="Plan updated">
                  <p>{actionMessage}</p>
                </Notice>
              ) : null}

              <div role="tablist" aria-label="Conference days" className="flex gap-2">
                {EVENT_DAYS.map((day, index) => {
                  const selected = day === selectedDay;
                  const label = dayTabLabel(day);
                  return (
                    <Button
                      key={day}
                      id={planDayTabId(day)}
                      role="tab"
                      type="button"
                      variant={selected ? "secondary" : "quiet"}
                      className="min-h-10 flex-1 px-2"
                      aria-selected={selected}
                      aria-controls={planDayPanelId(day)}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => {
                        setSelectedDay(day);
                        setActionMessage(null);
                        setGenError(null);
                      }}
                      onKeyDown={(event) => {
                        const key = event.key;
                        if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") {
                          return;
                        }
                        const nextIndex = dayTabFocusIndex(index, key);
                        if (nextIndex === null) return;
                        event.preventDefault();
                        const nextDay = EVENT_DAYS[nextIndex];
                        setSelectedDay(nextDay);
                        setActionMessage(null);
                        setGenError(null);
                        document.getElementById(planDayTabId(nextDay))?.focus();
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>

              <div
                id={planDayPanelId(selectedDay)}
                role="tabpanel"
                aria-labelledby={planDayTabId(selectedDay)}
                aria-busy={generating || undefined}
              >
                {focus ? (
                  <p className="mt-3 text-base text-ink">
                    <span className="font-semibold">Focus:</span> {focus}
                  </p>
                ) : null}

                {generating ? (
                  <Notice tone="loading" title="Plan generating">
                    <p>{genStage ?? PLAN_GENERATION_STAGES[0]}.</p>
                  </Notice>
                ) : null}

                {genError ? (
                  <Notice tone="error" title="Could not generate this day">
                    <p>{genError}</p>
                    <div className="mt-2">
                      <Button variant="secondary" onClick={() => void generateDay(selectedDay)}>
                        Try again
                      </Button>
                    </div>
                  </Notice>
                ) : null}

                {!generating && !genError ? (
                  <section aria-labelledby="plan-schedule-heading" className="mt-3">
                    <h2 id="plan-schedule-heading" className="sr-only">
                      Schedule for {dayTabLabel(selectedDay)}
                    </h2>
                    <Stack gap="sm">
                      {timeline.length === 0 ? (
                        <p className="text-sm text-muted">No sessions or breaks on this day yet.</p>
                      ) : (
                        timeline.map((block, index) => {
                          if (block.kind === "break") {
                            return (
                              <SessionCard
                                key={blockKey(block, index)}
                                kind="break"
                                title={breakTitle(block.planBreak.note)}
                                time={formatTime(block.start)}
                                detail={breakDetail(block.planBreak.note)}
                              />
                            );
                          }

                          const statusDetail = planSessionStatusDetail(block.item);
                          const presentedReason = presentPlanReason(block.item.reason);

                          return (
                            <SessionCard
                              key={blockKey(block, index)}
                              title={block.session.title}
                              time={formatTimeRange(block.start, block.end)}
                              room={block.session.room}
                              reasonLabel={
                                statusDetail ? undefined : (presentedReason.reasonLabel ?? "Why")
                              }
                              reason={statusDetail ? undefined : presentedReason.reason}
                              detail={statusDetail}
                            >
                              {!statusDetail ? (
                                <Button
                                  variant="quiet"
                                  className="min-h-10 w-auto px-0"
                                  onClick={(event) => {
                                    detailTriggerRef.current = event.currentTarget;
                                    setDetail(block);
                                  }}
                                >
                                  Details and alternatives
                                </Button>
                              ) : null}
                            </SessionCard>
                          );
                        })
                      )}
                    </Stack>
                  </section>
                ) : null}
              </div>

              {onCase ? (
                <Button variant="secondary" onClick={onCase}>
                  Make the case for attending
                </Button>
              ) : null}
            </>
          ) : null}
        </Stack>
      </Screen>

      <Sheet
        open={detail !== null}
        title={detail?.session.title ?? "Session details"}
        onClose={() => {
          setDetail(null);
          setEditError(null);
        }}
      >
        {detail && detailPresented ? (
          <Stack>
            <SessionCard
              time={formatTimeRange(detail.start, detail.end)}
              room={detail.session.room}
              reasonLabel={detailPresented.reasonLabel ?? "Why it's on your plan"}
              reason={detailPresented.reason}
              headingLevel={3}
            />
            {detailBullets.length > 0 ? (
              <>
                <h3 className="font-display text-lg font-semibold text-ink">Alternatives and clashes</h3>
                <ChangeList items={detailBullets} />
              </>
            ) : (
              <p className="text-sm text-muted">No alternative pick or clash note for this session.</p>
            )}

            {editError ? (
              <Notice tone="error" title="Could not update plan">
                <p>{editError}</p>
              </Notice>
            ) : null}

            <section aria-label="Change this session" className="flex flex-col gap-3">
              {detail.item.pinned ? (
                <p className="text-sm font-semibold text-ink">This session is kept on your plan.</p>
              ) : (
                <Button
                  variant="secondary"
                  disabled={isEditing}
                  onClick={() => void runEdit(detail.session.id, "pin")}
                >
                  Keep this session
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={isEditing}
                onClick={() => void runEdit(detail.session.id, "swap")}
              >
                Find another
              </Button>
              <Button
                variant="quiet"
                disabled={isEditing}
                onClick={() => void runEdit(detail.session.id, "drop")}
              >
                Remove from plan
              </Button>
            </section>
          </Stack>
        ) : null}
      </Sheet>
    </>
  );
}
