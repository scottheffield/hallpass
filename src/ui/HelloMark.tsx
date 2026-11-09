export interface HelloMarkProps {
  /** Compact wordmark for operational headers. The full sticker is the default. */
  compact?: boolean;
}

/** Conference name sticker. Full badge on entry; wordmark only once the day starts. */
export function HelloMark({ compact = false }: HelloMarkProps) {
  if (compact) {
    return <span className="hello-mark">Hallpass</span>;
  }

  return (
    <div className="hello-badge">
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
