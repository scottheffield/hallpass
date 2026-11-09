import { GOAL_THEMES } from "../../shared/event";
import type { GoalThemeId } from "../../shared/event";

/** Map free text to known goal theme ids. No model output here. */
export function inferGoalThemes(...chunks: string[]): GoalThemeId[] {
  const blob = chunks.join(" ").toLowerCase();
  const found: GoalThemeId[] = [];
  for (const theme of GOAL_THEMES) {
    const id = theme.id;
    const label = theme.label.toLowerCase();
    const words = id.split("-");
    const hit =
      blob.includes(label) ||
      words.some((w) => w.length > 3 && blob.includes(w)) ||
      (id === "ai-inference" && (blob.includes("inference") || blob.includes(" llm"))) ||
      (id === "incident-response" && blob.includes("incident"));
    if (hit && !found.includes(id)) found.push(id);
  }
  return found.slice(0, 4);
}
