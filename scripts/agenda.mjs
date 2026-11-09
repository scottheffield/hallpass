/**
 * Pure schedule normalization. No network. No secrets.
 * Session times in the Linux Foundation schedule have no offset and are Mountain Time.
 */

export const SCHEDULE_URL =
  "https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/schedule/";

export const CONFERENCE_OFFSET = "-07:00";

const DROP_TRACKS = new Set(["Breaks", "Registration"]);

const COMMUNITY_SUBTOPICS = new Set([
  "EnvoyCon",
  "Istio Day",
  "Cloud Native University",
  "KyvernoCon",
  "KubeVirt Summit",
  "Kubeflow Summit",
  "llm-d",
  "Network Nook",
  "BoF",
]);

const Q_COMPANY = 128829;
const Q_COMPANY_OVERRIDE = 138119;

const SAMPLE_IDS = [
  "1246200",
  "1233585",
  "1250865",
  "1246033",
  "1250770",
  "1244963",
  "1247858",
  "1248310",
  "1247612",
  "1250728",
  "1250494",
  "1250150",
  "1228453",
  "1250275",
  "1248185",
];

export function sampleSessionIds() {
  return [...SAMPLE_IDS];
}

export function stripHtml(value) {
  if (value == null) return "";
  let text = String(value);
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  text = text.replace(/\u00a0/g, " ");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n[ \t]+/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");
  return text.trim();
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeChar(Number.parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function safeChar(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  if (code < 32 && code !== 10 && code !== 9) return "";
  return String.fromCodePoint(code);
}

/** Naive schedule timestamps are Mountain Time. Keep an offset if one is already present. */
export function toMountain(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("missing session time");
  }
  if (/[+-]\d{2}:\d{2}$/.test(value) || value.endsWith("Z")) return value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
    throw new Error("session time is not a naive ISO timestamp");
  }
  return `${value}${CONFERENCE_OFFSET}`;
}

export function formatMountain(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(get("timeZoneName"));
  if (!match) throw new Error("could not format Mountain Time offset");
  const offset = `${match[1]}${match[2].padStart(2, "0")}:${(match[3] || "00").padStart(2, "0")}`;
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}${offset}`;
}

export function isLogistics(title, track) {
  if (DROP_TRACKS.has(track)) return true;
  const stripped = stripEmoji(title)
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (/^(coffee break|lunch|breakfast|snack break)\b/.test(stripped)) return true;
  if (/\bcoat(\s*\+\s*|\s+and\s+)bag check\b|\bcoat check\b|\bbag check\b/.test(stripped)) return true;
  if (/^registration\b/.test(stripped) && /\b(badge|pick-?up|check-?in)\b/.test(stripped)) return true;
  if (/^badge pick-?up\b/.test(stripped)) return true;
  return false;
}

function stripEmoji(value) {
  return String(value).replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "");
}

function answer(person, questionId) {
  const hit = (person.questionAnswers || []).find((item) => item.questionId === questionId);
  return typeof hit?.answerValue === "string" ? hit.answerValue.trim() : "";
}

function indexById(rows) {
  const map = new Map();
  for (const row of rows || []) map.set(row.id, row);
  return map;
}

function categoryMaps(categories) {
  const itemToGroup = new Map();
  for (const category of categories || []) {
    for (const item of category.items || []) {
      itemToGroup.set(item.id, { group: category.title, name: item.name });
    }
  }
  return itemToGroup;
}

function groupedNames(session, itemToGroup) {
  const groups = new Map();
  for (const id of session.categoryItems || []) {
    const found = itemToGroup.get(id);
    if (!found) continue;
    const list = groups.get(found.group) || [];
    list.push(found.name);
    groups.set(found.group, list);
  }
  return groups;
}

function speakerText(person) {
  const company = answer(person, Q_COMPANY_OVERRIDE) || answer(person, Q_COMPANY);
  const name = (person.fullName || `${person.firstName || ""} ${person.lastName || ""}`).trim();
  const tagline = (person.tagLine || "").trim();
  const bio = stripHtml(person.bio || "");
  return [name, company, tagline, bio].filter(Boolean).join(". ");
}

function buildSession(raw, { rooms, speakers, itemToGroup }) {
  const groups = groupedNames(raw, itemToGroup);
  const track = (groups.get("All Sessions") || [""])[0] || "";
  const subtopics = groups.get("SubTopic") || [];
  const projects = groups.get("CNCF Projects") || [];
  const audience = groups.get("Audience Level") || [];
  const endUser = groups.get("End User Programming") || [];
  const sponsored = groups.get("Is Sponsored Keynote") || [];
  const title = String(raw.title || "").trim();
  const abstract = stripHtml(raw.description || "");
  const room = (rooms.get(raw.roomId) || "Room TBD").trim() || "Room TBD";
  const speakerRows = (raw.speakers || [])
    .map((id) => speakers.get(id))
    .filter(Boolean);
  const speakerNames = speakerRows
    .map((person) => (person.fullName || "").trim())
    .filter(Boolean);
  const tags = [...new Set([...audience, ...subtopics, ...projects, ...endUser, ...sponsored])].sort((a, b) =>
    a.localeCompare(b),
  );
  const community = subtopics.filter((name) => COMMUNITY_SUBTOPICS.has(name)).join(", ");
  const searchText = [title, abstract, track, ...subtopics, ...projects].filter(Boolean).join("\n");
  const peopleText = speakerRows.map(speakerText).filter(Boolean).join("\n");
  const session = {
    id: String(raw.id),
    title,
    start: toMountain(raw.startsAt),
    end: toMountain(raw.endsAt),
    room,
    track,
    speakers: speakerNames,
    abstract,
    search_text: searchText,
    speaker_text: peopleText,
  };
  if (tags.length) session.tags = tags;
  if (community) session.community = community;
  if (/ALL ACCESS PASS REQUIRED/i.test(`${title}\n${abstract}`)) session.all_access = true;
  return session;
}

/**
 * @param {object} sched Page JSON, or the inner `{ sessions, speakers, rooms, categories }`.
 * @param {{ pulledAt: string }} options
 */
export function normalizeSched(sched, { pulledAt }) {
  const all = sched.all && Array.isArray(sched.all.sessions) ? sched.all : sched;
  const rooms = new Map((all.rooms || []).map((room) => [room.id, String(room.name || "").trim()]));
  const speakers = indexById(all.speakers);
  const itemToGroup = categoryMaps(all.categories);
  const rawSessions = all.sessions || [];
  const dropped = [];
  const sessions = [];
  for (const raw of rawSessions) {
    const groups = groupedNames(raw, itemToGroup);
    const track = (groups.get("All Sessions") || [""])[0] || "";
    const title = String(raw.title || "").trim();
    if (isLogistics(title, track)) {
      dropped.push({ id: String(raw.id), title, track, day: String(raw.startsAt || "").slice(0, 10) });
      continue;
    }
    sessions.push(buildSession(raw, { rooms, speakers, itemToGroup }));
  }
  sessions.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  const emptyDescriptions = sessions.filter((session) => session.abstract.length === 0).length;
  const perDay = {};
  for (const session of sessions) {
    const day = session.start.slice(0, 10);
    perDay[day] = (perDay[day] || 0) + 1;
  }
  const agenda = {
    source: SCHEDULE_URL,
    attribution:
      "Session schedule from The Linux Foundation for KubeCon + CloudNativeCon North America 2026. " +
      `${SCHEDULE_URL} Used with attribution. Hallpass is not affiliated with The Linux Foundation or the CNCF, and this use is not an endorsement. No logos are included.`,
    pulled_at: pulledAt,
    sessions,
  };
  return {
    agenda,
    counts: {
      total: rawSessions.length,
      dropped: dropped.length,
      kept: sessions.length,
      emptyDescriptions,
      perDay,
    },
    dropped,
  };
}

export function deriveRoom(name) {
  const parts = name.split("|").map((part) => part.trim()).filter(Boolean);
  const levelPart = parts.find((part) => /^Level \d+$/i.test(part));
  let level = levelPart || "";
  let landmark = parts[parts.length - 1] || name;

  if (/^off-site/i.test(name)) {
    level = "Off-site";
    landmark = "Not in the Salt Palace or the Hyatt";
  } else if (/room tbd/i.test(name)) {
    level = "Unassigned";
    landmark = "Room not assigned on the schedule";
  } else if (/lobby/i.test(name) && !level) {
    level = "Lobby";
    landmark = "Hyatt Regency lobby";
  } else if (/200 South Entrance/i.test(name)) {
    level = "Entrance";
    landmark = "200 South entrance";
  } else if (/upper mezzanine/i.test(name)) {
    landmark = "Upper mezzanine";
  } else if (/north grand ballroom foyer/i.test(name)) {
    landmark = "North Grand Ballroom foyer";
  } else if (/grand ballroom/i.test(name)) {
    landmark = "Grand Ballroom";
  } else if (/solutions showcase/i.test(name)) {
    const zone = name.match(/Cosmic Canyon|Alpine Overlook|Starlight Summit|Amber Hive|Astral Peak/i);
    landmark = zone ? `${zone[0]} in the Solutions Showcase` : "Solutions Showcase";
  } else if (/hall de/i.test(name)) {
    landmark = "Exhibit halls D and E";
  } else if (/halls a-c/i.test(name)) {
    landmark = "Exhibit halls";
  } else if (/^hyatt/i.test(name)) {
    landmark = parts[parts.length - 1] || "Hyatt Regency";
  } else if (/east registration/i.test(name)) {
    landmark = "East registration";
  }

  if (!level) level = "Unspecified";
  return { level, landmark };
}

export function buildRooms(sessions, hints = {}) {
  const names = [...new Set(sessions.map((session) => session.room))].sort((a, b) => a.localeCompare(b));
  return names.map((name) => {
    const derived = deriveRoom(name);
    const hint = hints[name] || {};
    const room = {
      name,
      level: hint.level || derived.level,
      landmark: hint.landmark || derived.landmark,
      walking_hint: hint.walking_hint ?? "",
    };
    if (hint.step_free_hint) room.step_free_hint = hint.step_free_hint;
    return room;
  });
}

export function sessionsSample(agenda) {
  const byId = new Map(agenda.sessions.map((session) => [session.id, session]));
  const missing = SAMPLE_IDS.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`sample sessions missing from agenda: ${missing.join(", ")}`);
  }
  return {
    label: "agenda-backed",
    note: "Subset copied from public/agenda.json. Every id is a real KubeCon + CloudNativeCon North America 2026 session. Not illustrative.",
    source: "public/agenda.json",
    pulled_at: agenda.pulled_at,
    sessions: SAMPLE_IDS.map((id) => byId.get(id)),
  };
}
