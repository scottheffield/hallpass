import { useState } from "react";
import type { IntakeAnswers } from "../../shared/api";
import { EVENT_NAME, INTAKE } from "../../shared/event";
import { Button, HelloMark, Screen, Stack, TextArea } from "../ui";

export interface IntakeViewProps {
  answers: IntakeAnswers;
  onAnswers: (next: IntakeAnswers) => void;
  onMakePlan: () => void;
  onExplore: () => void;
  busy?: boolean;
  error?: string | null;
}

export function IntakeView({ answers, onAnswers, onMakePlan, onExplore, busy, error }: IntakeViewProps) {
  const [showStarters, setShowStarters] = useState(Boolean(answers.figuring_it_out));

  function toggleFiguring() {
    const next = !showStarters;
    setShowStarters(next);
    onAnswers({ ...answers, figuring_it_out: next || undefined });
  }

  function toggleStarter(goal: string) {
    const current = answers.starter_goals ?? [];
    const has = current.includes(goal);
    const starter_goals = has ? current.filter((g) => g !== goal) : [...current, goal].slice(0, 3);
    onAnswers({ ...answers, starter_goals });
  }

  return (
    <Screen heading="Why are you here?" headingSize="md" kicker={EVENT_NAME} kickerDetail="Conference planning">
      <Stack gap="lg">
        <HelloMark />
        <TextArea
          label={INTAKE.purpose.prompt}
          labelAppearance="title"
          name="purpose"
          value={answers.purpose}
          onChange={(purpose) => onAnswers({ ...answers, purpose })}
          rows={4}
          placeholder={INTAKE.purpose.placeholder}
          hint={INTAKE.purpose.hint}
          disabled={busy}
        />
        <Stack gap="sm">
          <Button variant="quiet" onClick={toggleFiguring} disabled={busy}>
            {showStarters ? "Hide starter goals" : INTAKE.purpose.figuringItOut}
          </Button>
          {showStarters ? (
            <Stack gap="sm">
              <p className="text-sm text-muted">Tap any that fit. You can still write your own answer above.</p>
              {INTAKE.purpose.starterGoals.map((goal) => {
                const selected = answers.starter_goals?.includes(goal);
                return (
                  <Button
                    key={goal}
                    variant={selected ? "secondary" : "quiet"}
                    onClick={() => toggleStarter(goal)}
                    disabled={busy}
                  >
                    {goal}
                  </Button>
                );
              })}
            </Stack>
          ) : null}
        </Stack>
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <Stack gap="sm">
          <Button variant="primary" onClick={onMakePlan} disabled={busy}>
            {INTAKE.purpose.directAction}
            <span aria-hidden="true">→</span>
          </Button>
          <Button variant="secondary" onClick={onExplore} disabled={busy}>
            {INTAKE.purpose.exploreAction}
          </Button>
          <p className="text-center text-sm text-muted">Start directly, or explore together. You can change answers later.</p>
        </Stack>
      </Stack>
    </Screen>
  );
}
