import type { ProfileDraft } from "../../shared/api";
import demoPlanFile from "../../shared/fixtures/demo-plan.json";
import demoProfileFile from "../../shared/fixtures/demo-profile.json";
import type { Plan, Profile } from "../../shared/types";

export function fixtureProfile(attendeeId: string): Profile {
  const profile = structuredClone(demoProfileFile.profile) as Profile;
  profile.attendee_id = attendeeId;
  return profile;
}

export function fixtureProfileDraft(): ProfileDraft {
  const { attendee_id, updated_at, ...draft } = fixtureProfile("draft");
  void attendee_id;
  void updated_at;
  return draft;
}

export function fixturePlan(attendeeId: string): Plan {
  const plan = structuredClone(demoPlanFile.plan) as Plan;
  plan.attendee_id = attendeeId;
  return plan;
}
