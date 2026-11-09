import { useEffect, useId, useRef, useState } from "react";
import type { ApplyProposalRequest, CheckInResponse } from "../../../shared/api";
import type { MovedGoal, PlanProposal, WorthIt } from "../../../shared/types";
import { ApiFailure, post } from "../../lib/api";
import {
  Button,
  ChangeList,
  Choice,
  HelloMark,
  Notice,
  SessionCard,
  Sheet,
  Stack,
  TextArea,
} from "../../ui";
import {
  buildCheckInRequest,
  MOVED_GOAL_OPTIONS,
  NOTE_MAX,
  proposalChangeTexts,
  WORTH_IT_OPTIONS,
} from "./form";

export interface CheckInScreenProps {
  open: boolean;
  sessionId: string;
  sessionTitle: string;
  /** Already formatted, for example "10:00–10:40". */
  sessionTime?: string;
  sessionRoom?: string;
  onClose: () => void;
  /** Called after feedback is saved or a proposal decision is made. */
  onFinished?: (result: { planUpdated: boolean }) => void;
}

type Phase = "form" | "saved" | "proposal" | "submitting" | "applying";

function SavedMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0 text-action">
      <circle cx="9" cy="9" r="8" fill="currentColor" />
      <path d="M5 9.2 7.6 11.8 13 6.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckInScreen({
  open,
  sessionId,
  sessionTitle,
  sessionTime,
  sessionRoom,
  onClose,
  onFinished,
}: CheckInScreenProps) {
  const whyId = useId();
  const reqRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [worthIt, setWorthIt] = useState<WorthIt | "">("");
  const [movedGoal, setMovedGoal] = useState<MovedGoal | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stub, setStub] = useState(false);
  const [proposal, setProposal] = useState<PlanProposal | null>(null);

  useEffect(() => {
    reqRef.current += 1;
    if (!open) return;
    setPhase("form");
    setWorthIt("");
    setMovedGoal("");
    setNote("");
    setError(null);
    setStub(false);
    setProposal(null);
  }, [open, sessionId]);

  const payload = buildCheckInRequest(sessionId, worthIt, movedGoal, note);
  const isSubmitting = phase === "submitting";
  const noteTooLong = note.length > NOTE_MAX;
  const canSave = payload !== null && phase === "form" && !noteTooLong;

  function setNoteCapped(value: string) {
    setNote(value.slice(0, NOTE_MAX));
  }

  async function saveCheckIn() {
    if (!payload) return;
    const token = ++reqRef.current;
    setPhase("submitting");
    setError(null);
    try {
      const response = await post<CheckInResponse>("/api/checkin", payload);
      if (token !== reqRef.current) return;
      setStub(Boolean(response.stub));
      if (response.proposal) {
        setProposal(response.proposal);
        setPhase("proposal");
      } else {
        setPhase("saved");
      }
    } catch (err) {
      if (token !== reqRef.current) return;
      setPhase("form");
      setError(err instanceof ApiFailure ? err.message : "Could not save check-in. Try again.");
    }
  }

  async function decideProposal(accept: boolean) {
    if (!proposal) return;
    const token = ++reqRef.current;
    setPhase("applying");
    setError(null);
    const body: ApplyProposalRequest = { proposal_id: proposal.id, accept };
    try {
      await post("/api/plan/apply", body);
      if (token !== reqRef.current) return;
      onFinished?.({ planUpdated: accept });
      onClose();
    } catch (err) {
      if (token !== reqRef.current) return;
      setPhase("proposal");
      setError(err instanceof ApiFailure ? err.message : "Could not update your plan. Try again.");
    }
  }

  function dismissSaved() {
    onFinished?.({ planUpdated: false });
    onClose();
  }

  function skipAttendance() {
    onClose();
  }

  const sheetTitle =
    phase === "proposal" ? "Suggested change" : phase === "saved" ? "Feedback saved" : "How was that session?";

  return (
    <Sheet open={open} title={sheetTitle} onClose={onClose}>
      {phase === "form" || phase === "submitting" ? (
        <Stack gap="md">
          <HelloMark compact />
          <SessionCard title={sessionTitle} time={sessionTime ?? ""} room={sessionRoom} />
          <Choice
            legend="Worth your time?"
            name="worth_it"
            value={worthIt}
            options={WORTH_IT_OPTIONS}
            onChange={(value) => setWorthIt(value as WorthIt)}
          />
          <Choice
            legend="Moved your goal forward?"
            name="moved_goal"
            value={movedGoal}
            options={MOVED_GOAL_OPTIONS}
            onChange={(value) => setMovedGoal(value as MovedGoal)}
          />
          <TextArea
            label="Optional note"
            name="checkin_note"
            value={note}
            onChange={setNoteCapped}
            rows={3}
            placeholder="For example: Too introductory. I need concrete examples."
            hint={`${note.length}/${NOTE_MAX} characters. Sent securely with your check-in, not in the URL.`}
            disabled={isSubmitting}
          />
          {error ? (
            <Notice tone="error" title="Check-in not saved">
              <p>{error}</p>
            </Notice>
          ) : null}
          <Button variant="primary" disabled={!canSave || isSubmitting} onClick={saveCheckIn}>
            {isSubmitting ? "Saving…" : "Save check-in"}
          </Button>
          <div className="flex justify-center">
            <Button variant="quiet" disabled={isSubmitting} onClick={skipAttendance}>
              I didn&apos;t attend
            </Button>
          </div>
        </Stack>
      ) : null}

      {phase === "saved" ? (
        <Stack gap="md">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <SavedMark />
            Check-in saved
          </p>
          {stub ? (
            <Notice tone="stub" title="Demo fallback">
              <p>Storage or AI may be unavailable. Your answer is labeled accordingly on the server.</p>
            </Notice>
          ) : null}
          <Notice tone="info" title="Your plan wasn't changed">
            <p>No session changes are suggested for the rest of today.</p>
          </Notice>
          <Button variant="primary" onClick={dismissSaved}>
            Done
          </Button>
        </Stack>
      ) : null}

      {phase === "proposal" || phase === "applying" ? (
        <Stack gap="md">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <SavedMark />
            Check-in saved
          </p>
          {stub ? (
            <Notice tone="stub" title="Demo fallback">
              <p>This proposal may use labeled fallback planning.</p>
            </Notice>
          ) : null}
          <p className="text-base text-ink">Here is one way to adjust the rest of today.</p>
          <h2 id={whyId} className="m-0 font-display text-xl font-semibold text-ink">
            Why this fits
          </h2>
          <ChangeList labelId={whyId} items={proposalChangeTexts(proposal?.changes ?? [])} />
          {error ? (
            <Notice tone="error" title="Plan not updated">
              <p>{error}</p>
            </Notice>
          ) : null}
          <Button variant="primary" disabled={phase === "applying"} onClick={() => decideProposal(true)}>
            {phase === "applying" ? "Updating…" : "Apply change"}
          </Button>
          <Button variant="secondary" disabled={phase === "applying"} onClick={() => decideProposal(false)}>
            Keep my plan
          </Button>
        </Stack>
      ) : null}
    </Sheet>
  );
}
