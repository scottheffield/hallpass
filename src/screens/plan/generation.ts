export const PLAN_GENERATION_STAGES = [
  "Finding relevant sessions",
  "Checking overlaps",
  "Building your day",
] as const;

/** Index advances about every three seconds while generation runs. */
export function generationStageIndex(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0;
  const slot = Math.floor(elapsedMs / 3000);
  return Math.min(slot, PLAN_GENERATION_STAGES.length - 1);
}
