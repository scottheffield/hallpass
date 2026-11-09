export type CopyOutcome = "copied" | "unsupported" | "failed";

/** Copies plain text for the manager draft. Does not log the text. */
export async function copyCaseText(text: string): Promise<CopyOutcome> {
  const trimmed = text.trim();
  if (!trimmed) return "failed";
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(trimmed);
      return "copied";
    }
  } catch {
  }
  return "unsupported";
}
