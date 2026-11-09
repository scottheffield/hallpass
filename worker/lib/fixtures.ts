import type { ProfileDraft } from "../../shared/api";
import demoPlanFile from "../../shared/fixtures/demo-plan.json";
import demoProfileFile from "../../shared/fixtures/demo-profile.json";
import type { Plan, Profile } from "../../shared/types";

function seedProfile(): Profile {
  if ("profile" in demoProfileFile && demoProfileFile.profile) {
    return structuredClone(demoProfileFile.profile as Profile);
  }
  return structuredClone(demoProfileFile as Profile);
}

function seedPlan(): Plan {
  if ("plan" in demoPlanFile && demoPlanFile.plan) {
    return structuredClone(demoPlanFile.plan as Plan);
  }
  return structuredClone(demoPlanFile as Plan);
}

export function fixtureProfile(attendeeId: string): Profile {
  const profile = seedProfile();
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
  const plan = seedPlan();
  plan.attendee_id = attendeeId;
  return plan;
}
