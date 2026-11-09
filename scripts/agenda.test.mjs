import assert from "node:assert/strict";
import test from "node:test";
import { buildRooms, deriveRoom, isLogistics, normalizeSched, stripHtml, toMountain } from "./agenda.mjs";

test("mountain offset is appended once", () => {
  assert.equal(toMountain("2026-11-10T11:30:00"), "2026-11-10T11:30:00-07:00");
  assert.equal(toMountain("2026-11-10T11:30:00-07:00"), "2026-11-10T11:30:00-07:00");
});

test("html text keeps words and drops tags", () => {
  assert.equal(stripHtml("<p>What&#039;s up &amp; running?</p><p>Line &quot;two&quot;</p>"), 'What\'s up & running?\nLine "two"');
});

test("breaks and registration drop, real talks stay", () => {
  assert.equal(isLogistics("☕ Coffee Break", "Breaks"), true);
  assert.equal(isLogistics("🍲 Lunch | On Own", "Project Lightning Talks"), true);
  assert.equal(isLogistics("Coat + Bag Check", "Registration"), true);
  assert.equal(isLogistics("Registration + Badge Pick-Up", "Registration"), true);
  assert.equal(isLogistics("When Infrastructure Breaks in Production: How EarnIn Brought Testing to the Full CNCF Stack", "Platform Engineering"), false);
  assert.equal(isLogistics("Platform Engineering Day | ALL ACCESS PASS REQUIRED", "CNCF-hosted Co-located Events"), false);
  assert.equal(isLogistics("Microsoft Azure Day | SEPARATE REGISTRATION REQUIRED", "Sponsor-hosted Co-located Events"), false);
});

test("normalize keeps an empty description and flags all-access", () => {
  const sched = {
    sessions: [
      session("1", "Welcome + Opening Remarks", "", "2026-11-10T09:00:00", "2026-11-10T09:10:00", 1, [10]),
      session("2", "☕ Coffee Break", "", "2026-11-10T10:45:00", "2026-11-10T11:15:00", 1, [11]),
      session("3", "Ask Your Platform", "<p>What&#039;s happening?</p>", "2026-11-10T11:30:00", "2026-11-10T12:00:00", 2, [10, 20, 30], ["spk"]),
      session("4", "Coat + Bag Check", "", "2026-11-10T07:30:00", "2026-11-10T18:00:00", 3, [12]),
      session("5", "Observability Day | ALL ACCESS PASS REQUIRED", "<p>Full day.</p>", "2026-11-09T09:00:00", "2026-11-09T17:30:00", 2, [13]),
    ],
    speakers: [
      {
        id: "spk",
        fullName: "Ada Lovelace",
        tagLine: "Analytical Engines",
        bio: "<p>Built engines.</p>",
        questionAnswers: [
          { questionId: 128829, answerValue: "Example Co" },
          { questionId: 138119, answerValue: "Override Co" },
        ],
      },
    ],
    rooms: [
      { id: 1, name: "Salt Palace | Level 1 | Hall DE" },
      { id: 2, name: "Salt Palace | Level 1 | Grand Ballroom H " },
      { id: 3, name: "Salt Palace | Level 2 | East Registration" },
    ],
    categories: [
      {
        id: 1,
        title: "All Sessions",
        items: [
          { id: 10, name: "Keynote Sessions" },
          { id: 11, name: "Breaks" },
          { id: 12, name: "Registration" },
          { id: 13, name: "CNCF-hosted Co-located Events" },
        ],
      },
      { id: 2, title: "Audience Level", items: [{ id: 20, name: "Any Level" }] },
      { id: 3, title: "CNCF Projects", items: [{ id: 30, name: "Kubernetes" }] },
    ],
  };
  const { agenda, counts } = normalizeSched(sched, { pulledAt: "2026-11-09T19:00:00-07:00" });
  assert.equal(counts.total, 5);
  assert.equal(counts.dropped, 2);
  assert.equal(counts.kept, 3);
  assert.equal(counts.emptyDescriptions, 1);
  const welcome = agenda.sessions.find((item) => item.id === "1");
  assert.equal(welcome.abstract, "");
  assert.equal(welcome.start, "2026-11-10T09:00:00-07:00");
  const talk = agenda.sessions.find((item) => item.id === "3");
  assert.equal(talk.room, "Salt Palace | Level 1 | Grand Ballroom H");
  assert.equal(talk.abstract, "What's happening?");
  assert.match(talk.search_text, /Ask Your Platform/);
  assert.match(talk.search_text, /Kubernetes/);
  assert.match(talk.speaker_text, /Ada Lovelace/);
  assert.match(talk.speaker_text, /Override Co/);
  assert.equal(talk.speakers[0], "Ada Lovelace");
  assert.equal(talk.tags.includes("Any Level"), true);
  const pass = agenda.sessions.find((item) => item.id === "5");
  assert.equal(pass.all_access, true);
  assert.equal(agenda.attribution.includes("The Linux Foundation"), true);
  assert.equal(agenda.attribution.toLowerCase().includes("endorsement"), true);
});

test("rooms get a level, and only hinted rooms get walking text", () => {
  const rooms = buildRooms(
    [
      { room: "Salt Palace | Level 1 | Grand Ballroom H" },
      { room: "Off-Site Location" },
      { room: "Salt Palace | Level 2 | 254" },
    ],
    {
      "Salt Palace | Level 1 | Grand Ballroom H": {
        landmark: "Grand Ballroom",
        walking_hint: "Cross the south foyer.",
        step_free_hint: "Confirm at an Info Desk.",
      },
    },
  );
  assert.equal(rooms[0].name, "Off-Site Location");
  assert.equal(rooms[0].walking_hint, "");
  assert.equal(rooms[0].step_free_hint, undefined);
  const hinted = rooms.find((room) => room.name.includes("Grand Ballroom"));
  assert.equal(hinted.walking_hint, "Cross the south foyer.");
  assert.equal(hinted.level, "Level 1");
  assert.deepEqual(deriveRoom("Salt Palace | Level 2 | 254"), {
    level: "Level 2",
    landmark: "254",
  });
});

function session(id, title, description, startsAt, endsAt, roomId, categoryItems, speakers = []) {
  return {
    id,
    title,
    description,
    startsAt,
    endsAt,
    speakers,
    categoryItems,
    roomId,
    questionAnswers: [],
  };
}
