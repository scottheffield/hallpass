import styles from "./delight.module.css";

export interface HelloMarkProps {
  /** Compact wordmark for operational headers. The full sticker is the default. */
  compact?: boolean;
  /** When set, the compact mark is a home control. */
  onActivate?: () => void;
}

/** Conference name sticker. Full badge on entry; wordmark only once the day starts. */
export function HelloMark({ compact = false, onActivate }: HelloMarkProps) {
  if (compact) {
    if (onActivate) {
      return (
        <button type="button" className="hello-mark hello-mark-btn" onClick={onActivate} aria-label="Hallpass, go home">
          Hallpass
        </button>
      );
    }
    return <span className="hello-mark">Hallpass</span>;
  }

  return (
    <div className={`hello-badge ${styles.badge}`}>
      <div className="hello-badge-top">
        <div className="hello-badge-hello">HELLO</div>
        <div className="hello-badge-mine">my name is</div>
      </div>
      <div className="hello-badge-body">
        <div className="hello-badge-name">Hallpass</div>
      </div>
    </div>
  );
}
