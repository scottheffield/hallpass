import type { Insights, Session } from "../../shared/types";

export type SessionMovingGoalRow = Insights["sessions_moving_goals"][number];

export type SessionMovingGoalWithTitle = SessionMovingGoalRow & {
  session_title?: string;
};

/** Join conference session titles from agenda.json (or fixture) for organizer display. */
export function attachSessionTitles(insights: Insights, sessions: Session[]): Insights {
  const titleById = new Map<string, string>();
  for (const session of sessions) {
    const title = session.title?.trim();
    if (session.id && title) titleById.set(session.id, title);
  }

  const sessions_moving_goals: SessionMovingGoalWithTitle[] = insights.sessions_moving_goals.map((row) => {
    const session_title = titleById.get(row.session_id);
    return session_title ? { ...row, session_title } : row;
  });

  return { ...insights, sessions_moving_goals };
}
