import { useCallback, useEffect, useState } from "react";
import type { ReadoutResponse } from "../../../shared/api";
import type { Readout, Session } from "../../../shared/types";
import { getSession, loadAgenda } from "../../lib/agenda";
import { ApiFailure, post } from "../../lib/api";
import { formatTimeRange } from "../today/timeline";
import { Button, Notice, Screen, SessionCard, Sheet, Stack, TextArea } from "../../ui";
import { copyCaseText } from "../case/copy";
import {
  contentGaps,
  goalStatusLabel,
  readoutEvidenceLine,
  readoutHeading,
  suggestionFollowups,
  teamRecapDraft,
  unclearGoals,
} from "./present";

export interface ReadoutScreenProps {
  onBack?: () => void;
}

type LoadPhase = "loading" | "ready" | "error";

async function fetchReadout(): Promise<ReadoutResponse> {
  return post<ReadoutResponse>("/api/readout", {});
}

function GoalBlock({ goal, status }: { goal: string; status: "hit" | "missed" | "unclear" }) {
  const detail =
    status === "hit"
      ? "Check-ins marked related sessions as helping this goal."
      : status === "missed"
        ? "Feedback suggests this goal still needs work."
        : "There is not enough session feedback to judge this goal yet.";
  return (
    <article className="rounded-xl border-2 border-line bg-surface px-3 py-3">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{goalStatusLabel(status)}</p>
      <h2 className="mt-1 font-display text-lg font-semibold text-ink">{goal.replace(/\.$/, "")}</h2>
      <p className="mt-2 text-base leading-snug text-ink">{detail}</p>
    </article>
  );
}

export function ReadoutScreen({ onBack }: ReadoutScreenProps) {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [readout, setReadout] = useState<Readout | null>(null);
  const [helpedSessions, setHelpedSessions] = useState<Session[]>([]);
  const [stub, setStub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapDraft, setRecapDraft] = useState("");
  const [recapCopyStatus, setRecapCopyStatus] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setRecapCopyStatus(null);
    try {
      const [response, agenda] = await Promise.all([fetchReadout(), loadAgenda()]);
      setReadout(response.readout);
      setStub(Boolean(response.stub));
      const helped = response.readout.helped_sessions.flatMap((id) => {
        const session = getSession(agenda.sessions, id);
        return session ? [session] : [];
      });
      setHelpedSessions(helped);
      setRecapDraft(teamRecapDraft(response.readout.followups));
      setPhase("ready");
    } catch (err) {
      setReadout(null);
      setHelpedSessions([]);
      if (err instanceof ApiFailure && err.status === 501) {
        setStub(true);
        setError("Readout is not available yet.");
      } else {
        setError(err instanceof Error ? err.message : "Could not load your readout.");
      }
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleRecapCopy() {
    const outcome = await copyCaseText(recapDraft);
    setRecapCopyStatus(
      outcome === "copied"
        ? "Copied recap."
        : outcome === "unsupported"
          ? "Select the recap text and copy manually."
          : "Nothing to copy yet.",
    );
  }

  const suggestions = readout ? suggestionFollowups(readout.followups) : [];
  const unclear = readout ? unclearGoals(readout) : [];
  const gaps = readout ? contentGaps(readout) : [];

  return (
    <>
      <Screen
        heading={readout ? readoutHeading(readout.final) : "Your conference, so far"}
        headingSize="md"
        brand
        onBack={onBack}
        kicker={readout ? readoutEvidenceLine(readout) : undefined}
        lead={
          phase === "loading" ? (
            <Notice tone="loading" title="Loading your readout" />
          ) : phase === "error" ? (
            <Notice tone="error" title="Could not load readout">
              <p>{error}</p>
              <div className="mt-3">
                <Button variant="secondary" onClick={() => void reload()}>
                  Try again
                </Button>
              </div>
            </Notice>
          ) : stub ? (
            <Notice tone="info" title="Built from your check-ins">
              <p>Summary text is rule-based because the AI service is not configured.</p>
            </Notice>
          ) : null
        }
      >
        {phase === "ready" && readout ? (
          <Stack gap="lg">
            {readout.goals_hit.map((goal) => (
              <GoalBlock key={`hit-${goal}`} goal={goal} status="hit" />
            ))}

            {readout.goals_missed.map((goal) => (
              <GoalBlock key={`miss-${goal}`} goal={goal} status="missed" />
            ))}

            {unclear.map((goal) => (
              <GoalBlock key={`unclear-${goal}`} goal={goal} status="unclear" />
            ))}

            {helpedSessions.length > 0 ? (
              <section aria-labelledby="readout-helped-heading">
                <h2 id="readout-helped-heading" className="text-base font-semibold text-ink">
                  Sessions that helped
                </h2>
                <ul className="mt-2 flex list-none flex-col gap-3 p-0">
                  {helpedSessions.map((session) => (
                    <li key={session.id}>
                      <SessionCard
                        title={session.title}
                        time={formatTimeRange(session.start, session.end)}
                        room={session.room}
                        reason="You marked this session as moving a goal forward."
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {gaps.length > 0 ? (
              <section aria-labelledby="readout-gaps-heading">
                <h2 id="readout-gaps-heading" className="text-base font-semibold text-ink">
                  Gaps
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink">
                  {gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {suggestions.length > 0 ? (
              <section aria-labelledby="readout-next-heading">
                <h2 id="readout-next-heading" className="text-base font-semibold text-ink">
                  Possible next steps
                </h2>
                <p className="mt-1 text-sm text-muted">Suggestions, not requirements.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink">
                  {suggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <Stack gap="sm">
              <Button variant="secondary" onClick={() => setRecapOpen(true)}>
                Review recap for my team
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Screen>

      <Sheet open={recapOpen} title="Team recap" onClose={() => setRecapOpen(false)}>
        <Stack gap="md">
          <TextArea
            label="Edit before you copy"
            name="team-recap"
            value={recapDraft}
            onChange={setRecapDraft}
            rows={10}
            hint="Plain language. Do not claim a technique unless your check-ins support it."
          />
          <Button onClick={() => void handleRecapCopy()}>Copy recap</Button>
          {recapCopyStatus ? (
            <p className="text-sm text-muted" role="status">
              {recapCopyStatus}
            </p>
          ) : null}
        </Stack>
      </Sheet>
    </>
  );
}
