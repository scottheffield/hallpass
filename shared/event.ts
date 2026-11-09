// KubeCon + CloudNativeCon North America 2026. Intake copy and the closed theme list live here
// so later slices don't invent their own wording or free-text clusters.

export const EVENT_NAME = "KubeCon + CloudNativeCon North America 2026";
export const EVENT_CITY = "Salt Lake City";
export const EVENT_OFFSET = "-07:00";
export const EVENT_TIME_ZONE = "America/Denver";

/** Tuesday through Thursday. Date keys for Plan.days. */
export const EVENT_DAYS = ["2026-11-10", "2026-11-11", "2026-11-12"] as const;
export type EventDay = (typeof EVENT_DAYS)[number];

export const GOAL_THEMES = [
  { id: "incident-response", label: "Incident response" },
  { id: "observability", label: "Observability" },
  { id: "platform-engineering", label: "Platform engineering" },
  { id: "ai-inference", label: "AI and inference" },
  { id: "security", label: "Security" },
  { id: "networking", label: "Networking" },
  { id: "delivery", label: "Delivery and supply chain" },
  { id: "cost", label: "Cost and efficiency" },
  { id: "developer-experience", label: "Developer experience" },
  { id: "data-storage", label: "Data and storage" },
  { id: "community", label: "Community and contribution" },
] as const;

export type GoalThemeId = (typeof GOAL_THEMES)[number]["id"];

export function isGoalTheme(value: string): value is GoalThemeId {
  return GOAL_THEMES.some((theme) => theme.id === value);
}

export const INTAKE = {
  purpose: {
    prompt: "What would make this trip worth it?",
    hint: "For example: solve a work problem, learn a topic, find a community.",
    placeholder: "We spend too long finding the cause of Kubernetes incidents.",
    figuringItOut: "I'm still figuring it out",
    starterGoals: [
      "Find practical ways to debug production Kubernetes",
      "See how platform teams run AI inference",
      "Learn one security practice I can take home",
      "Meet people who run platforms like mine",
    ],
    directAction: "Make my plan",
    exploreAction: "Help me think it through",
  },
  work: {
    role: "What do you work on?",
    problems: "What problems are you trying to solve?",
    tools: "Which tools do you use?",
    people: "Anyone you hope to hear from?",
    expertise: "What kind of expert would help?",
  },
  pace: {
    prompt: "How much room would you like between sessions?",
    choices: [
      { id: "light", label: "Relaxed", detail: "Fewer sessions and more breaks." },
      { id: "balanced", label: "Balanced", detail: "A full day with room to pause." },
      { id: "packed", label: "Full", detail: "See as much as you can." },
    ],
    energy: "How is your energy this week?",
    breaks: "When do you want breaks?",
    access: "Access and comfort preferences",
  },
  confirm: "Here's what we'll plan around.",
} as const;
