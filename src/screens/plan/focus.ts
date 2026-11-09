/** Short label for the plan focus line from profile goals. */
export function planFocusLine(goals: readonly string[]): string | null {
  const trimmed = goals.map((goal) => goal.trim()).filter((goal) => goal.length > 0);
  if (trimmed.length === 0) return null;
  return shortenFocus(trimmed[0]);
}

export function shortenFocus(goal: string): string {
  const firstSentence = goal.split(/[.!?]/)[0]?.trim() ?? goal.trim();
  if (!firstSentence) return goal.trim();
  if (firstSentence.length <= 88) return firstSentence;
  return `${firstSentence.slice(0, 85).trim()}…`;
}
