import { useCallback, useEffect, useMemo, useState } from "react";
import type { InsightsResponse } from "../../../shared/api";
import type { Insights } from "../../../shared/types";
import { EVENT_NAME } from "../../../shared/event";
import { getSession, loadAgenda } from "../../lib/agenda";
import { ApiFailure, get } from "../../lib/api";
import { Button, Notice, Screen, Stack } from "../../ui";
import {
  formatAttendeeSample,
  formatBreakDemand,
  formatCheckInSample,
  formatMovedGoalPercent,
  goalThemeLabel,
  sessionRowLabel,
} from "./format";
import { MetricBar } from "./MetricBar";

export interface InsightsScreenProps {
  onBack?: () => void;
  backLabel?: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsResponse };

async function fetchInsights(): Promise<InsightsResponse> {
  return get<InsightsResponse>("/api/insights");
}

function sectionMax(values: number[]): number {
  if (values.length === 0) return 1;
  return Math.max(...values, 1);
}

function InsightsSections({
  insights,
  sessionTitles,
}: {
  insights: Insights;
  sessionTitles: ReadonlyMap<string, string>;
}) {
  const goalMax = sectionMax(insights.top_goals.map((row) => row.count));
  const gapMax = sectionMax(insights.gaps.map((row) => row.count));
  const sessionMax = sectionMax(insights.sessions_moving_goals.map((row) => row.moved_goal_rate));

  return (
    <Stack gap="lg">
      <section aria-labelledby="insights-goals-heading">
        <h2 id="insights-goals-heading" className="font-display text-lg font-semibold text-ink">
          Arrival goal themes
        </h2>
        <p className="mt-1 text-sm text-muted">{formatAttendeeSample(insights.n_attendees)}</p>
        {insights.top_goals.length === 0 ? (
          <p className="mt-3 text-base text-muted">
            No goal themes reached the minimum group size. That is not the same as attendees getting nothing from the
            event.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4" aria-label="Top goal themes">
            {insights.top_goals.map((row) => (
              <MetricBar
                key={row.goal_theme}
                label={goalThemeLabel(row.goal_theme)}
                value={row.count}
                valueText={String(row.count)}
                max={goalMax}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="insights-sessions-heading">
        <h2 id="insights-sessions-heading" className="font-display text-lg font-semibold text-ink">
          Sessions moving goals
        </h2>
        <p className="mt-1 text-sm text-muted">Share of check-ins where attendees said a session helped their goal.</p>
        {insights.sessions_moving_goals.length === 0 ? (
          <p className="mt-3 text-base text-muted">
            No sessions have enough grouped check-ins yet. Missing data does not mean sessions failed.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4" aria-label="Sessions by moved-goal rate">
            {insights.sessions_moving_goals.map((row) => {
              const title = sessionTitles.get(row.session_id);
              const checkIns = formatCheckInSample(row.n);
              return (
                <MetricBar
                  key={row.session_id}
                  label={sessionRowLabel(row.session_id, title)}
                  value={row.moved_goal_rate}
                  valueText={formatMovedGoalPercent(row.moved_goal_rate)}
                  detail={checkIns || undefined}
                  max={sessionMax}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="insights-gaps-heading">
        <h2 id="insights-gaps-heading" className="font-display text-lg font-semibold text-ink">
          Common gaps
        </h2>
        <p className="mt-1 text-sm text-muted">Themes from conference readouts, grouped for organizers.</p>
        {insights.gaps.length === 0 ? (
          <p className="mt-3 text-base text-muted">
            No gap themes reached the minimum group size. Fewer readouts can mean less grouped signal, not fewer
            takeaways.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4" aria-label="Common gap themes">
            {insights.gaps.map((row) => (
              <MetricBar
                key={row.gap_theme}
                label={goalThemeLabel(row.gap_theme)}
                value={row.count}
                valueText={String(row.count)}
                max={gapMax}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="insights-breaks-heading">
        <h2 id="insights-breaks-heading" className="font-display text-lg font-semibold text-ink">
          Break demand
        </h2>
        <p id="insights-breaks-detail" className="mt-1 text-sm text-muted">
          {formatBreakDemand(insights.break_demand, insights.n_attendees)}
        </p>
        <p
          className="mt-3 font-display text-3xl font-semibold tabular-nums text-ink"
          aria-describedby="insights-breaks-detail"
        >
          <span className="sr-only">Break demand count: </span>
          {insights.break_demand}
        </p>
      </section>
    </Stack>
  );
}

export function InsightsScreen({ onBack, backLabel }: InsightsScreenProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [sessionTitles, setSessionTitles] = useState<ReadonlyMap<string, string>>(new Map());

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [insights, agenda] = await Promise.all([fetchInsights(), loadAgenda()]);
      const titles = new Map<string, string>();
      for (const row of insights.sessions_moving_goals) {
        const session = getSession(agenda.sessions, row.session_id);
        if (session?.title) titles.set(row.session_id, session.title);
      }
      setSessionTitles(titles);
      setState({ kind: "ready", data: insights });
    } catch (err) {
      const message =
        err instanceof ApiFailure
          ? (err.body?.error ?? "Could not load organizer insights.")
          : err instanceof Error
            ? err.message
            : "Could not load organizer insights.";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stub = state.kind === "ready" && state.data.stub === true;
  const sampleLead = useMemo(() => {
    if (state.kind !== "ready") return null;
    return (
      <Stack gap="sm">
        {stub ? (
          <Notice tone="info" title="Sample data">
            Counts come from prepared demo attendees, not live production indexes.
          </Notice>
        ) : null}
        <p className="text-sm text-muted">Organizer view · aggregates only · no individual rows.</p>
      </Stack>
    );
  }, [state, stub]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Screen
        heading="What attendees came for, and what helped."
        headingSize="md"
        kicker={EVENT_NAME}
        brand
        onBack={onBack}
        backLabel={backLabel}
        lead={sampleLead}
        headerEnd={
          state.kind === "ready" ? (
            <span className="tabular-nums text-sm font-semibold text-muted">
              {state.data.n_attendees} attendee profiles
            </span>
          ) : undefined
        }
      >
        {state.kind === "loading" ? (
          <Notice tone="loading" title="Loading insights">
            Pulling grouped counts from the API.
          </Notice>
        ) : null}
        {state.kind === "error" ? (
          <Stack gap="md">
            <Notice tone="error" title="Could not load insights">
              {state.message}
            </Notice>
            <Button onClick={() => void reload()}>Try again</Button>
          </Stack>
        ) : null}
        {state.kind === "ready" ? (
          <InsightsSections insights={state.data} sessionTitles={sessionTitles} />
        ) : null}
      </Screen>
    </div>
  );
}
