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
import { dayNeedsGeneration, dayTabLabel } from "./days";
import { sessionDetailBullets } from "./detail";
import { generationStageIndex, PLAN_GENERATION_STAGES } from "./generation";
import { planFocusLine } from "./focus";

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

export function PlanScreen({ onGoals, onCase }: PlanScreenProps) {
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

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
  setGenError(null);
    try {
      const [planResult, agenda, profileResult] = await Promise.all([
        fetchPlan(),
        loadAgenda(),
        fetchProfile(),
      ]);
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
    if (!plan || stub || loading || generating) return;
    const dayBody = plan.days[selectedDay];
    if (!dayNeedsGeneration(dayBody)) return;
    void generateDay(selectedDay);
  }, [plan, selectedDay, stub, loading, generating, generateDay]);

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

  const headerEnd = onGoals ? (
    <Button variant="quiet" className="min-h-0 w-auto px-0 py-0 text-sm font-semibold" onClick={onGoals}>
      Goals
    </Button>
  ) : null;

  const isEditing = editingId !== null;

  return (
    <>
      <Screen brand heading="Your conference plan" headerEnd={headerEnd}>
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

          {!loading && !error && !stub && !plan ? (
            <Notice tone="empty" title="No plan yet">
              <p>Save a profile and build a plan before sessions can appear here.</p>
            </Notice>
          ) : null}

          {!loading && !error && !stub && plan ? (
            <>
              {plan.source === "basic" ? (
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

              <nav aria-label="Conference days" className="flex gap-2">
                {EVENT_DAYS.map((day) => {
                  const selected = day === selectedDay;
                  return (
                    <Button
                      key={day}
                      variant={selected ? "secondary" : "quiet"}
                      className="min-h-10 flex-1 px-2"
                      aria-current={selected ? "page" : undefined}
                      onClick={() => {
                        setSelectedDay(day);
                        setActionMessage(null);
                        setGenError(null);
                      }}
                    >
                      {dayTabLabel(day)}
                    </Button>
                  );
                })}
              </nav>

              {focus ? (
                <p className="text-base text-ink">
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

                      const pinned = block.item.pinned ? "Kept on your plan" : undefined;
                      const status =
                        block.item.status === "done"
                          ? "Done"
                          : block.item.status === "skipped"
                            ? "Skipped"
                            : pinned;

                      return (
                        <SessionCard
                          key={blockKey(block, index)}
                          title={block.session.title}
                          time={formatTimeRange(block.start, block.end)}
                          room={block.session.room}
                          reasonLabel={status ? undefined : "Why"}
                          reason={status ? undefined : block.item.reason}
                          detail={status}
                        >
                          {!status ? (
                            <Button
                              variant="quiet"
                              className="min-h-10 w-auto px-0"
                              onClick={() => setDetail(block)}
                            >
                              Details and alternatives
                            </Button>
                          ) : null}
                        </SessionCard>
                      );
                    })
                  )}
                </Stack>
              ) : null}

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
        {detail ? (
          <Stack>
            <SessionCard
              title={detail.session.title}
              time={formatTimeRange(detail.start, detail.end)}
              room={detail.session.room}
              reasonLabel="Why it's on your plan"
              reason={detail.item.reason}
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

            <Stack gap="sm">
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
            </Stack>
          </Stack>
        ) : null}
      </Sheet>
    </>
  );
}
