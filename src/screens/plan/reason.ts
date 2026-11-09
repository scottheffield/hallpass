export interface PresentedReason {
  reasonLabel?: string;
  reason: string;
}

const MATCH_PREFIX =
  /^(topic|speaker background|named speaker)\s+match\s*:\s*(.+)$/is;

/** Split AI match prefixes into a label and body; prefer topic when the copy cites the abstract. */
export function presentPlanReason(raw: string): PresentedReason {
  const trimmed = raw.trim();
  if (!trimmed) return { reason: "" };

  const match = trimmed.match(MATCH_PREFIX);
  if (!match) return { reason: trimmed };

  let kind = match[1].toLowerCase();
  const body = match[2].trim();
  if (kind === "speaker background" && citesAbstract(body)) {
    kind = "topic";
  }

  const reasonLabel =
    kind === "topic"
      ? "Topic match:"
      : kind === "named speaker"
        ? "Named speaker match:"
        : "Speaker background match:";

  return { reasonLabel, reason: body };
}

function citesAbstract(body: string): boolean {
  return (
    /\babstract\b/i.test(body) ||
    /\bsession topic\b/i.test(body) ||
    /\bfrom the abstract\b/i.test(body) ||
    /\bThe abstract mentions\b/.test(body)
  );
}
