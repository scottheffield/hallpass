import { useEffect, useState } from "react";
import type { Profile } from "../../shared/types";
import type { ProfileDraft, ProfileResponse } from "../../shared/api";
import { INTAKE } from "../../shared/event";
import { post } from "../lib/api";
import { ApiFailure } from "../lib/api";
import { Button, Notice, Screen, Stack, TextArea } from "../ui";

export function GoalsView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await post<ProfileResponse>("/api/profile/get", {});
        if (!cancelled) setProfile(res.profile);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiFailure ? err.message : "Could not load goals.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit() {
    if (!profile) return;
    const { attendee_id, updated_at, ...rest } = profile;
    void attendee_id;
    void updated_at;
    setDraft(rest);
    setNotice(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await post<ProfileResponse>("/api/profile", { profile: draft });
      setProfile(res.profile);
      setDraft(null);
      setNotice("Saved. Future days will use these goals when you regenerate a plan.");
    } catch (err) {
      setError(err instanceof ApiFailure ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen heading="Goals">
        <p className="text-sm text-muted">Loading…</p>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen heading="Goals">
        <Notice tone="info" title="No goals yet">
          Answer the opening question on the home screen first.
        </Notice>
      </Screen>
    );
  }

  if (draft) {
    return (
      <Screen heading="Edit goals" headingSize="md">
        <Stack gap="md">
          <p className="text-sm text-muted">Plans for future days will use the updated goals.</p>
          {draft.goals.map((goal, index) => (
            <TextArea
              key={index}
              label={`Goal ${index + 1}`}
              name={`goal-${index}`}
              value={goal}
              onChange={(value) => {
                const goals = [...draft.goals];
                goals[index] = value;
                setDraft({ ...draft, goals });
              }}
              rows={2}
            />
          ))}
          <TextArea
            label={INTAKE.pace.access}
            name="access"
            value={draft.access_needs ?? ""}
            onChange={(access_needs) => setDraft({ ...draft, access_needs: access_needs || undefined })}
            rows={2}
          />
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <Stack gap="sm">
            <Button variant="primary" onClick={save} disabled={saving}>
              Save goals
            </Button>
            <Button variant="quiet" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen heading="Your goals" headingSize="md">
      <Stack gap="md">
        <p className="text-base text-ink">{profile.why_summary}</p>
        <ul className="m-0 list-disc space-y-2 pl-5 text-ink">
          {profile.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
        {notice ? (
          <Notice tone="info" title="Updated">
            {notice}
          </Notice>
        ) : null}
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button variant="secondary" onClick={startEdit}>
          Edit goals
        </Button>
      </Stack>
    </Screen>
  );
}
