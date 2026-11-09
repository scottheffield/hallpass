const GOAL_IN_REASON = /Matches your goal "([^"]+)"/i;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

/** Goal quoted in a plan reason, or the best-matching profile goal by keywords. */
export function goalForPlanReason(reason: string, profileGoals: readonly string[]): string | null {
  const trimmed = reason.trim();
  if (!trimmed) return null;
  const quoted = GOAL_IN_REASON.exec(trimmed);
  if (quoted?.[1]) return quoted[1].trim();

  let best: { goal: string; score: number } | null = null;
  for (const goal of profileGoals) {
    const needles = tokenize(goal);
    if (needles.length === 0) continue;
    const hay = trimmed.toLowerCase();
    const score = needles.reduce((sum, needle) => (hay.includes(needle) ? sum + 1 : sum), 0);
    if (score === 0) continue;
    if (!best || score > best.score) best = { goal, score };
  }
  return best?.goal ?? null;
}

export function goalsReferToSameTopic(a: string, b: string): boolean {
  const left = tokenize(a);
  const right = new Set(tokenize(b));
  if (left.length === 0 || right.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return left.some((word) => right.has(word));
}
