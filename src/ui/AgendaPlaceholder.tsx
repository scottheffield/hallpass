import type { CSSProperties } from "react";
import styles from "./agendaPlaceholder.module.css";

/** Illustrative times for the decorative loading mini-agenda only. */
const PLACEHOLDER_TIMES = ["9:30", "11:15", "2:00"] as const;

export function AgendaPlaceholder() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={`${styles.agenda} ${styles.agendaAnimated}`}>
        {PLACEHOLDER_TIMES.map((time, slot) => (
          <div key={time} className={styles.card} style={{ "--slot": slot } as CSSProperties}>
            <span className={styles.time}>{time}</span>
            <div className={styles.lines}>
              <span className={styles.line} />
              <span className={styles.lineShort} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
