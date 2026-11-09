import { useEffect, useRef, useState } from "react";
import { attendeeJourneyPhase, conferencePhase, JOURNEY_PHASES } from "./journeyPhase";
import styles from "./journey.module.css";

const AT_CONFERENCE_HINT_KEY = "hallpass.journey.hint.at";

export interface JourneyProps {
  now: Date;
  hasProfile: boolean;
  hasPreparedPlan: boolean;
}

/** Orientation, not navigation: phase follows attendee progress, then the calendar once prepared. */
export function Journey({ now, hasProfile, hasPreparedPlan }: JourneyProps) {
  const current = attendeeJourneyPhase(now, { hasProfile, hasPreparedPlan });
  const calendarDuringConference =
    hasProfile && hasPreparedPlan && conferencePhase(now) === 1;
  const [showAtConferenceHint, setShowAtConferenceHint] = useState(false);
  const prevPhase = useRef(current);

  useEffect(() => {
    const advancedToAtConference =
      prevPhase.current === 0 && current === 1 && calendarDuringConference;
    prevPhase.current = current;
    if (!advancedToAtConference) return;
    try {
      if (sessionStorage.getItem(AT_CONFERENCE_HINT_KEY) === "1") return;
      sessionStorage.setItem(AT_CONFERENCE_HINT_KEY, "1");
    } catch {
      /* sessionStorage may be unavailable */
    }
    setShowAtConferenceHint(true);
  }, [current, calendarDuringConference]);

  const preparingOnEventDays = !hasProfile || !hasPreparedPlan;

  return (
    <div className={styles.journey} role="group" aria-label="Your conference journey">
      <ol className={styles.phases}>
        {JOURNEY_PHASES.map((label, index) => (
          <li key={label} aria-current={index === current ? "step" : undefined}>
            <span className={styles.marker} aria-hidden="true">{index + 1}</span>
            <span>{label}</span>
            {index === current ? <span className="sr-only"> — current phase</span> : null}
          </li>
        ))}
      </ol>
      {preparingOnEventDays && current === 0 ? (
        <p className={styles.hint}>Set your goals and build your plan first. The conference stage opens once your plan is ready.</p>
      ) : null}
      {showAtConferenceHint ? (
        <p className={styles.hint} role="status">
          You are at the conference. Today is your home base for what is next.
        </p>
      ) : null}
    </div>
  );
}
