import type { AgentMessage } from "../../shared/api";
import type { Room } from "../../shared/types";
import type { AgentContext } from "./context";
import { shortRoom } from "./context";
import { roomForName } from "./rooms";

function formatTime(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = match[2];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function lastUserMessage(messages: AgentMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user") return message.content.trim();
  }
  return "";
}

function directionAnswer(room: Room | null, roomName: string, accessNeeds?: string): string {
  const label = shortRoom(roomName);
  if (!room) {
    return `I do not have walking directions for ${label}. Check an Info Desk in the Salt Palace foyer.`;
  }
  const parts = [`${label} is on ${room.level}. Landmark: ${room.landmark}.`];
  if (room.walking_hint.trim()) parts.push(room.walking_hint.trim());
  const stepFree = accessNeeds?.toLowerCase().includes("step") && room.step_free_hint?.trim();
  if (stepFree) parts.push(room.step_free_hint!.trim());
  return parts.join(" ");
}

function roomFromQuestion(text: string, ctx: AgentContext, rooms: Room[]): string | null {
  const lower = text.toLowerCase();
  if (ctx.next && (lower.includes("next") || lower.includes("where") || lower.includes("room"))) {
    return ctx.next.room;
  }
  for (const room of rooms) {
    const short = shortRoom(room.name).toLowerCase();
    if (short && lower.includes(short.toLowerCase())) return room.name;
    if (lower.includes(room.landmark.toLowerCase())) return room.name;
  }
  return null;
}

/** Rule-based reply when Claude is unavailable. Labeled fallback in the SSE payload. */
export function fallbackAnswer(ctx: AgentContext, messages: AgentMessage[], rooms: Room[]): string {
  const question = lastUserMessage(messages).toLowerCase();
  if (!ctx.next && ctx.remaining.length === 0) {
    return "No sessions left on today's plan. Open Plan to see other days.";
  }

  const wantsDirections =
    question.includes("how do i get") ||
    question.includes("directions") ||
    question.includes("find room") ||
    question.includes("where is");

  if (wantsDirections) {
    const targetName = roomFromQuestion(question, ctx, rooms) ?? ctx.next?.room;
    if (!targetName) return "Tell me a room name from your plan and I can point you to the landmark.";
    const room = roomForName(rooms, targetName);
    return directionAnswer(room, targetName, ctx.accessNeeds);
  }

  if (ctx.next) {
    const time = formatTime(ctx.next.start);
    const room = shortRoom(ctx.next.room);
    if (question.includes("next") || question.includes("now") || question.length < 80) {
      return `Next: ${room} at ${time}. ${ctx.next.title}.`;
    }
  }

  if (ctx.remaining.length > 0) {
    const lines = ctx.remaining.slice(0, 3).map((row) => `${formatTime(row.start)} ${shortRoom(row.room)}`);
    return `Still on your plan today: ${lines.join("; ")}.`;
  }

  return "I can answer plan and room questions when Claude is not configured. Ask what is next or how to reach a room.";
}
