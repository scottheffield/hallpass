import { useCallback, useEffect, useState } from "react";
import type { CaseResponse, PlanResponse } from "../../../shared/api";
import type { CaseForAttending, Plan, Session } from "../../../shared/types";
import { joinPlanSessions, loadAgenda } from "../../lib/agenda";
import { ApiFailure, post } from "../../lib/api";
import { formatTimeRange } from "../today/timeline";
import { Button, Notice, Screen, SessionCard, Stack, TextArea } from "../../ui";
import { CASE_COPY_STATUS_ROLE, CASE_SESSION_HEADING_LEVEL } from "./a11y";
import { copyCaseText, type CopyOutcome } from "./copy";
import { planReasonBySessionId, reasonForCaseSession } from "./planSessions";
import { presentPlanReason } from "../plan/reason";

export interface CaseScreenProps {
  onBack?: () => void;
  backLabel?: string;
}

type LoadPhase = "loading" | "ready" | "error";

const COPY_MESSAGES: Record<CopyOutcome, string> = {
  copied: "Copied to clipboard.",
  unsupported: "Copy is not available here. Select the text and copy manually.",
  failed: "Nothing to copy yet.",
};

async function fetchCase(): Promise<CaseResponse> {
  return post<CaseResponse>("/api/case", {});
}

async function fetchPlan(): Promise<Plan | null> {
  try {
    const response = await post<PlanResponse>("/api/plan/get", {});
    return response.plan;
  } catch {
    return null;
  }
}

export function CaseScreen({ onBack, backLabel }: CaseScreenProps) {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [caseItem, setCaseItem] = useState<CaseForAttending | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [planReasons, setPlanReasons] = useState<Map<string, string>>(() => new Map());
  const [draftText, setDraftText] = useState("");
  const [stub, setStub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setCopyStatus(null);
    try {
      const [response, agenda, plan] = await Promise.all([fetchCase(), loadAgenda(), fetchPlan()]);
      setCaseItem(response.case);
      setDraftText(response.case.text);
      setStub(Boolean(response.stub));
      const planned = joinPlanSessions(agenda.sessions, response.case.sessions);
      setSessions(planned);
      setPlanReasons(planReasonBySessionId(plan));
      setPhase("ready");
    } catch (err) {
      setCaseItem(null);
      setSessions([]);
      setPlanReasons(new Map());
      if (err instanceof ApiFailure && err.status === 501) {
        setStub(true);
        setError("Case for attending is not available yet.");
      } else {
        setError(err instanceof Error ? err.message : "Could not load your case for attending.");
      }
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCopy() {
    const outcome = await copyCaseText(draftText);
    setCopyStatus(COPY_MESSAGES[outcome]);
  }

  return (
    <Screen
      heading="Make the case for attending"
      headingSize="md"
      brand
      onBack={onBack}
      backLabel={backLabel}
      kicker="Optional draft for your manager"
      lead={
        phase === "loading" ? (
          <Notice tone="loading" title="Loading your draft" />
        ) : phase === "error" ? (
          <Notice tone="error" title="Could not load draft">
            <p>{error}</p>
            <div className="mt-3">
              <Button variant="secondary" onClick={() => void reload()}>
                Try again
              </Button>
            </div>
          </Notice>
        ) : stub ? (
          <Notice tone="info" title="Sample draft">
            <p>Built without the AI summary service. Session names still come from your plan.</p>
          </Notice>
        ) : null
      }
    >
      {phase === "ready" && caseItem ? (
        <Stack gap="lg">
          {caseItem.problems.length > 0 ? (
            <section aria-labelledby="case-problems-heading">
              <h2 id="case-problems-heading" className="text-base font-semibold text-ink">
                Problems you are bringing
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink">
                {caseItem.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {sessions.length > 0 ? (
            <section aria-labelledby="case-sessions-heading">
              <h2 id="case-sessions-heading" className="text-base font-semibold text-ink">
                Sessions in your plan
              </h2>
              <ul className="mt-2 flex list-none flex-col gap-3 p-0">
                {sessions.map((session) => {
                  const rawReason = reasonForCaseSession(session.id, planReasons);
                  const presented = rawReason ? presentPlanReason(rawReason) : null;
                  return (
                    <li key={session.id}>
                      <SessionCard
                        title={session.title}
                        time={formatTimeRange(session.start, session.end)}
                        room={session.room}
                        reasonLabel={
                          presented ? (presented.reasonLabel ?? "Why it's on your plan") : undefined
                        }
                        reason={presented?.reason}
                        headingLevel={CASE_SESSION_HEADING_LEVEL}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {caseItem.bring_back.length > 0 ? (
            <section aria-labelledby="case-takeaways-heading">
              <h2 id="case-takeaways-heading" className="text-base font-semibold text-ink">
                Intended takeaways
              </h2>
              <p className="mt-1 text-sm text-muted">Plans, not promises. Adjust before you copy.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink">
                {caseItem.bring_back.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <TextArea
            label="Draft for your manager"
            name="case-draft"
            value={draftText}
            onChange={setDraftText}
            rows={8}
            hint="Plain text. Edit anything that does not match what you intend to bring back."
          />

          <Stack gap="sm">
            <Button onClick={() => void handleCopy()}>Copy draft</Button>
            {copyStatus ? (
              <p className="text-sm text-muted" role={CASE_COPY_STATUS_ROLE}>
                {copyStatus}
              </p>
            ) : null}
          </Stack>
        </Stack>
      ) : null}
    </Screen>
  );
}
