import { useId } from "react";
import type { ProfileDraft } from "../../../shared/api";
import { INTAKE } from "../../../shared/event";
import type { Energy, Pacing } from "../../../shared/types";
import { Button, Choice, Field, Notice, Screen, Stack, TextArea } from "../../ui";

export interface ConfirmScreenProps {
  draft: ProfileDraft;
  onDraft: (draft: ProfileDraft) => void;
  onBack: () => void;
  onSave: () => void;
  busy?: boolean;
  aiUnavailable?: boolean;
  error?: string | null;
}

export function ConfirmScreen({
  draft,
  onDraft,
  onBack,
  onSave,
  busy,
  aiUnavailable,
  error,
}: ConfirmScreenProps) {
  const goalsHeadingId = useId();

  function updateGoal(index: number, value: string) {
    const goals = [...draft.goals];
    goals[index] = value;
    onDraft({ ...draft, goals });
  }

  function addGoal() {
    if (draft.goals.length >= 3) return;
    onDraft({ ...draft, goals: [...draft.goals, ""] });
  }

  return (
    <Screen heading="Your goals" headingSize="md" backLabel="Back" onBack={onBack}>
      <Stack gap="lg">
        {aiUnavailable ? (
          <Notice tone="info" title="AI unavailable">
            We built this summary from your answers. Please check it before saving.
          </Notice>
        ) : null}
        <p className="text-base text-ink">{INTAKE.confirm}</p>
        <section aria-labelledby={goalsHeadingId}>
          <h2 id={goalsHeadingId} className="text-base font-semibold text-ink">
            Goals to plan around
          </h2>
          <div className="mt-2">
          <Stack gap="sm">
            {draft.goals.map((goal, index) => (
              <TextArea
                key={index}
                label={`Goal ${index + 1}`}
                name={`goal-${index}`}
                value={goal}
                onChange={(value) => updateGoal(index, value)}
                rows={2}
                disabled={busy}
              />
            ))}
            {draft.goals.length < 3 ? (
              <Button variant="quiet" onClick={addGoal} disabled={busy}>
                Add a goal
              </Button>
            ) : null}
          </Stack>
          </div>
        </section>
        <section aria-labelledby="confirm-context-heading">
          <h2 id="confirm-context-heading" className="text-base font-semibold text-ink">
            How you work
          </h2>
          <div className="mt-2">
          <Stack gap="sm">
            <Field
              label="Context"
              name="role"
              value={draft.role}
              onChange={(role) => onDraft({ ...draft, role })}
              hint="Role or team."
              disabled={busy}
            />
            <TextArea
              label="What we'll remember"
              name="why"
              value={draft.why_summary}
              onChange={(why_summary) => onDraft({ ...draft, why_summary })}
              rows={3}
              disabled={busy}
            />
          </Stack>
          </div>
        </section>
        <section aria-labelledby="confirm-pace-heading">
          <h2 id="confirm-pace-heading" className="text-base font-semibold text-ink">
            Pace and comfort
          </h2>
          <div className="mt-2">
          <Stack gap="sm">
            <Choice
              legend={INTAKE.pace.prompt}
              name="pacing"
              value={draft.pacing}
              onChange={(pacing) => onDraft({ ...draft, pacing: pacing as Pacing })}
              options={INTAKE.pace.choices.map((c) => ({
                value: c.id,
                label: c.label,
                description: c.detail,
              }))}
            />
            <Choice
              legend={INTAKE.pace.energy}
              name="energy"
              value={draft.energy}
              onChange={(energy) => onDraft({ ...draft, energy: energy as Energy })}
              options={[
                { value: "low", label: "Low", description: "Go easy this week." },
                { value: "medium", label: "Medium", description: "Steady days." },
                { value: "high", label: "High", description: "Make the most of it." },
              ]}
            />
            <TextArea
              label={INTAKE.pace.breaks}
              name="breaks"
              value={draft.breaks}
              onChange={(breaks) => onDraft({ ...draft, breaks })}
              rows={2}
              disabled={busy}
            />
            <TextArea
              label={INTAKE.pace.access}
              name="access"
              value={draft.access_needs ?? ""}
              onChange={(access_needs) => onDraft({ ...draft, access_needs: access_needs || undefined })}
              rows={2}
              disabled={busy}
            />
          </Stack>
          </div>
        </section>
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button variant="primary" onClick={onSave} disabled={busy}>
          Save and continue
        </Button>
      </Stack>
    </Screen>
  );
}
