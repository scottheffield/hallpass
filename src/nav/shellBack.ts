import type { ShellPlace } from "./types";

const TAB_BACK: Partial<Record<ShellPlace, string>> = {
  today: "← Back to Today",
  plan: "← Back to Plan",
  goals: "← Back to Goals",
};

/** Visible back control label for focused screens and directions. */
export function shellBackLabel(returnPlace: ShellPlace): string {
  return TAB_BACK[returnPlace] ?? "← Back";
}
