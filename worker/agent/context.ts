import type { AgentMessage } from "../../shared/api";
import { EVENT_OFFSET } from "../../shared/event";
import type { Plan, PlanItem, Profile, Room, Session } from "../../shared/types";
import { toConferenceIso } from "../plan/time";
import { roomForName } from "./rooms";

export interface PlanRow {
  session_id: string;
  title: string;
  start: string;
  end: string;
  room: string;
  reason: string;
}

export interface AgentContext {
  nowIso: string;
  day: string;
  goals: string[];
  accessNeeds?: string;
  remaining: PlanRow[];
  next: PlanRow | null;
  nextRoom: Room | null;
}

export function conferenceDay(at: Date): string {
  return toConferenceIso(at).slice(0, 10);
}

function wallTime(iso: string): number {
  return Date.parse(iso);
}

function formatTime(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = match[2];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

/** Short label for a room string, e.g. "Grand Ballroom H" from the full venue path. */
export function shortRoom(room: string): string {
  const parts = room.split("|").map((part) => part.trim());
  return parts[parts.length - 1] ?? room;
}

export function planRowsForDay(
  day: string,
  items: PlanItem[],
  sessions: Map<string, Session>,
  now: Date,
): { remaining: PlanRow[]; next: PlanRow | null } {
  const nowMs = now.getTime();
  const rows: PlanRow[] = [];
  for (const item of items) {
    if (item.status !== "planned") continue;
    const session = sessions.get(item.session_id);
    if (!session || session.start.slice(0, 10) !== day) continue;
    if (wallTime(session.end) <= nowMs) continue;
    rows.push({
      session_id: item.session_id,
      title: session.title,
      start: session.start,
      end: session.end,
      room: session.room,
      reason: item.reason,
    });
  }
  rows.sort((a, b) => wallTime(a.start) - wallTime(b.start));
  return { remaining: rows, next: rows[0] ?? null };
}

export function buildAgentContext(
  at: Date,
  profile: Profile,
  plan: Plan,
  sessions: Map<string, Session>,
  rooms: Room[],
): AgentContext {
  const day = conferenceDay(at);
  const dayPlan = plan.days[day];
  const items = dayPlan?.items ?? [];
  const { remaining, next } = planRowsForDay(day, items, sessions, at);
  const nextRoom = next ? roomForName(rooms, next.room) : null;
  return {
    nowIso: toConferenceIso(at),
    day,
    goals: profile.goals,
    accessNeeds: profile.access_needs?.trim() || undefined,
    remaining,
    next,
    nextRoom,
  };
}

const SYSTEM_RULES = `You are Hallpass, a conference assistant for KubeCon + CloudNativeCon in Salt Lake City.
Answer only about this attendee's plan, rooms, and schedule at this conference.
Use short sentences with specific rooms and times. No hype and no praise openers.
If you are unsure, say what you do not know. Never invent rooms or sessions that are not in the context.
Decline unrelated tasks politely.`;

function roomBlock(room: Room | null, accessNeeds?: string): string {
  if (!room) return "Room hint: not in the venue list.";
  const lines = [`Room: ${room.name}`, `Level: ${room.level}`, `Landmark: ${room.landmark}`];
  if (room.walking_hint.trim()) lines.push(`Walking: ${room.walking_hint.trim()}`);
  const stepFree = accessNeeds?.toLowerCase().includes("step") && room.step_free_hint?.trim();
  if (stepFree) lines.push(`Step-free: ${room.step_free_hint!.trim()}`);
  return lines.join("\n");
}

export function buildSystemPrompt(ctx: AgentContext): string {
  const remaining =
    ctx.remaining.length === 0
      ? "No remaining planned sessions today."
      : ctx.remaining
          .map(
            (row) =>
              `- ${formatTime(row.start)}–${formatTime(row.end)} | ${row.title} | ${row.room}\n  Reason: ${row.reason}`,
          )
          .join("\n");

  const nextLine = ctx.next
    ? `Next up: ${ctx.next.title} at ${formatTime(ctx.next.start)} in ${shortRoom(ctx.next.room)} (${ctx.next.room}).`
    : "Next up: none on today's plan.";

  return [
    SYSTEM_RULES,
    "",
    `Conference time now: ${ctx.nowIso} (${EVENT_OFFSET}).`,
    `Today: ${ctx.day}.`,
    `Goals: ${ctx.goals.join(" | ") || "(none saved)"}`,
    "",
    nextLine,
    roomBlock(ctx.nextRoom, ctx.accessNeeds),
    "",
    "Remaining plan for today:",
    remaining,
  ].join("\n");
}

export function claudeMessages(messages: AgentMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages.map((message) => ({ role: message.role, content: message.content }));
}
