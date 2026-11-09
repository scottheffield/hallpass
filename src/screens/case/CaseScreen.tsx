import { useCallback, useEffect, useState } from "react";
import type { CaseResponse } from "../../../shared/api";
import type { CaseForAttending, Session } from "../../../shared/types";
import { joinPlanSessions, loadAgenda } from "../../lib/agenda";
import { ApiFailure, post } from "../../lib/api";
import { Button, Notice, Screen, SessionCard, Stack, TextArea } from "../../ui";
import { copyCaseText, type CopyOutcome } from "./copy";

export interface CaseScreenProps {
  onBack?: () => void;
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

export function CaseScreen({ onBack }: CaseScreenProps) {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [caseItem, setCaseItem] = useState<CaseForAttending | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draftText, setDraftText] = useState("");
  const [stub, setStub] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setCopyStatus(null);
    try {
      const [response, agenda] = await Promise.all([fetchCase(), loadAgenda()]);
      setCaseItem(response.case);
      setDraftText(response.case.text);
      setStub(Boolean(response.stub));
      const planned = joinPlanSessions(agenda.sessions, response.case.sessions);
      setSessions(planned);
      setPhase("ready");
    } catch (err) {
      setCaseItem(null);
      setSessions([]);
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
                {sessions.map((session) => (
                  <li key={session.id}>
                    <SessionCard
                      title={session.title}
                      time={`${session.start.slice(11, 16)}–${session.end.slice(11, 16)}`}
                      room={session.room}
                      reason="On your conference plan"
                    />
                  </li>
                ))}
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
              <p className="text-sm text-muted" role="status">
                {copyStatus}
              </p>
            ) : null}
          </Stack>
        </Stack>
      ) : null}
    </Screen>
  );
}
