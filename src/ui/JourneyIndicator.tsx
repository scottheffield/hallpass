import { conferencePhase, JOURNEY_PHASES } from "./journeyPhase";
import styles from "./journey.module.css";

/** Orientation, not navigation: revisiting a task never changes calendar phase. */
export function Journey({ now }: { now: Date }) {
  const current = conferencePhase(now);
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
    </div>
  );
}
