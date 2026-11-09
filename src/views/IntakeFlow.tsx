import { useCallback, useState } from "react";
import type { IntakeAnswers, InterviewResponse, ProfileDraft, ProfileResponse } from "../../shared/api";
import { post, ApiFailure } from "../lib/api";
import { Button, Choice, Field, Notice, Sheet, Stack } from "../ui";
import { ConfirmView } from "./ConfirmView";
import { buildExplorePlan, type ExploreStep } from "./exploreSteps";
import { IntakeView } from "./IntakeView";

type Phase = "entry" | "clarify" | "confirm";

const emptyAnswers = (): IntakeAnswers => ({ purpose: "" });

export interface IntakeFlowProps {
  onFinished: () => void;
}

export function IntakeFlow({ onFinished }: IntakeFlowProps) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [answers, setAnswers] = useState<IntakeAnswers>(emptyAnswers);
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
  const [clarifyText, setClarifyText] = useState("");
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [explorePlan, setExplorePlan] = useState<ExploreStep[]>([]);
  const [exploreIndex, setExploreIndex] = useState(0);
  const [stepValue, setStepValue] = useState("");

  const runInterview = useCallback(async (nextAnswers: IntakeAnswers) => {
    setBusy(true);
    setError(null);
    try {
      const res = await post<InterviewResponse>("/api/interview", { answers: nextAnswers });
      setAnswers(nextAnswers);
      if (res.clarify && !nextAnswers.clarify_answer) {
        setClarifyQuestion(res.clarify);
        setDraft(res.profile);
        setAiUnavailable(Boolean(res.basic));
        setPhase("clarify");
        return;
      }
      setDraft(res.profile);
      setAiUnavailable(Boolean(res.basic));
      setPhase("confirm");
    } catch (err) {
      setError(err instanceof ApiFailure ? err.message : "Could not build a summary.");
    } finally {
      setBusy(false);
    }
  }, []);

  async function saveProfile() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await post<ProfileResponse>("/api/profile", { profile: draft });
      onFinished();
    } catch (err) {
      setError(err instanceof ApiFailure ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  function openExplore() {
    setExplorePlan(buildExplorePlan(answers));
    setExploreIndex(0);
    setStepValue("");
    setExploreOpen(true);
  }

  const step = exploreOpen ? (explorePlan[exploreIndex] ?? null) : null;

  return (
    <>
      {phase === "entry" ? (
        <IntakeView
          answers={answers}
          onAnswers={setAnswers}
          busy={busy}
          error={error}
          onMakePlan={() => void runInterview(answers)}
          onExplore={openExplore}
        />
      ) : null}
      {phase === "clarify" && clarifyQuestion ? (
        <Stack gap="lg">
          <Notice tone="info" title="One more detail">
            {clarifyQuestion}
          </Notice>
          <Field
            label="Your answer"
            name="clarify"
            value={clarifyText}
            onChange={setClarifyText}
            disabled={busy}
          />
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              void runInterview({ ...answers, clarify_answer: clarifyText.trim() || answers.purpose })
            }
          >
            Continue
          </Button>
          <Button
            variant="quiet"
            disabled={busy}
            onClick={() => {
              setPhase("confirm");
              setClarifyQuestion(null);
            }}
          >
            Skip and review summary
          </Button>
        </Stack>
      ) : null}
      {phase === "confirm" && draft ? (
        <ConfirmView
          draft={draft}
          onDraft={setDraft}
          onBack={() => setPhase("entry")}
          onSave={() => void saveProfile()}
          busy={busy}
          aiUnavailable={aiUnavailable}
          error={error}
        />
      ) : null}

      <Sheet open={exploreOpen} title="Help me think it through" onClose={() => setExploreOpen(false)}>
        <Stack gap="md">
          {answers.purpose.trim() ? (
            <Notice tone="info" title="Starting from your answer">
              <p className="text-sm">{answers.purpose}</p>
            </Notice>
          ) : null}
          {step?.kind === "choice" ? (
            <Choice
              legend={step.legend}
              name={step.name}
              value={stepValue}
              onChange={setStepValue}
              hint={step.hint}
              options={step.options}
            />
          ) : null}
          {step?.kind === "field" ? (
            <Field
              label={step.legend}
              name={step.name}
              value={stepValue}
              onChange={setStepValue}
              placeholder={step.placeholder}
            />
          ) : null}
          {!step ? (
            <Notice tone="info" title="Ready to plan">
              You can use what you shared, or go back for more detail on the opening screen.
            </Notice>
          ) : null}
          <Stack gap="sm">
            {step ? (
              <Button
                variant="primary"
                onClick={() => {
                  const next =
                    step.kind === "choice" || step.kind === "field"
                      ? step.apply(answers, stepValue.trim())
                      : answers;
                  setAnswers(next);
                  setExploreIndex((i) => i + 1);
                  setStepValue("");
                }}
                disabled={step.kind === "choice" && !stepValue.trim()}
              >
                Continue
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                setExploreOpen(false);
                void runInterview(answers);
              }}
              disabled={busy}
            >
              Use what I&apos;ve shared
            </Button>
            <Button variant="quiet" onClick={() => setExploreOpen(false)}>
              Back to opening question
            </Button>
          </Stack>
        </Stack>
      </Sheet>
    </>
  );
}
