import type { IntakeAnswers } from "../../../shared/api";
import { EVENT_NAME, INTAKE } from "../../../shared/event";
import { Button, HelloMark, Notice, Screen, Stack, TextArea } from "../../ui";
import { starterGoalSelectedLabel } from "./accessibility";

export interface IntakeScreenProps {
  answers: IntakeAnswers;
  onAnswers: (next: IntakeAnswers) => void;
  onMakePlan: () => void;
  onExplore: () => void;
  busy?: boolean;
  error?: string | null;
  showStarters: boolean;
  onToggleStarters: () => void;
}

export function IntakeScreen({
  answers,
  onAnswers,
  onMakePlan,
  onExplore,
  busy,
  error,
  showStarters,
  onToggleStarters,
}: IntakeScreenProps) {
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
        {showStarters ? (
          <section aria-labelledby="starter-goals-heading">
            <h2 id="starter-goals-heading" className="text-base font-semibold text-ink">
              Starter goals
            </h2>
            <p className="text-sm text-muted">Tap any that fit. You can still write your own answer above.</p>
            <div className="mt-2">
              <Stack gap="sm">
                {INTAKE.purpose.starterGoals.map((goal) => {
                  const selected = answers.starter_goals?.includes(goal) ?? false;
                  const selectedLabel = starterGoalSelectedLabel(selected);
                  return (
                    <Button
                      key={goal}
                      type="button"
                      variant={selected ? "secondary" : "quiet"}
                      className="justify-between gap-3 text-left"
                      aria-pressed={selected}
                      onClick={() => toggleStarter(goal)}
                      disabled={busy}
                    >
                      <span>{goal}</span>
                      {selectedLabel ? (
                        <span className="shrink-0 text-sm font-semibold text-action-quiet">{selectedLabel}</span>
                      ) : null}
                    </Button>
                  );
                })}
              </Stack>
            </div>
          </section>
        ) : null}
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {busy ? <Notice tone="loading" title="Reading your answers…" /> : null}
        <Stack gap="sm">
          <Button variant="primary" onClick={onMakePlan} disabled={busy}>
            {INTAKE.purpose.directAction}
            <span aria-hidden="true">→</span>
          </Button>
          <Button variant="quiet" onClick={onToggleStarters} disabled={busy}>
            {showStarters ? "Hide starter goals" : INTAKE.purpose.figuringItOut}
          </Button>
          <Button variant="quiet" onClick={onExplore} disabled={busy}>
            {INTAKE.purpose.exploreAction}
          </Button>
          <p className="text-center text-sm text-muted">Start directly, or explore together. You can change answers later.</p>
        </Stack>
      </Stack>
    </Screen>
  );
}
