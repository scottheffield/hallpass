import type { AppTab } from "./AppFrame";

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      <circle cx="10" cy="10" r="3.1" fill="currentColor" stroke="none" />
      <g {...stroke}>
        <line x1="10" y1="2.25" x2="10" y2="4.75" />
        <line x1="10" y1="15.25" x2="10" y2="17.75" />
        <line x1="2.25" y1="10" x2="4.75" y2="10" />
        <line x1="15.25" y1="10" x2="17.75" y2="10" />
        <line x1="4.55" y1="4.55" x2="6.3" y2="6.3" />
        <line x1="13.7" y1="13.7" x2="15.45" y2="15.45" />
        <line x1="15.45" y1="4.55" x2="13.7" y2="6.3" />
        <line x1="6.3" y1="13.7" x2="4.55" y2="15.45" />
      </g>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      <g {...stroke}>
        <path d="M3.5 5.5 9 3.75 11 3.75 16.5 5.5V14.5L11 16.25 9 16.25 3.5 14.5V5.5Z" />
        <path d="M9 3.75V16.25" />
        <path d="M11 3.75V16.25" fill="currentColor" fillOpacity="0.18" stroke="none" />
        <path d="M11 3.75 16.5 5.5 11 8.25Z" fill="currentColor" fillOpacity="0.22" />
      </g>
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      <g {...stroke}>
        <circle cx="10" cy="10" r="6.75" />
        <circle cx="10" cy="10" r="3.75" />
        <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

export function TabNavIcon({ tab }: { tab: AppTab }) {
  if (tab === "today") return <SunIcon />;
  if (tab === "plan") return <MapIcon />;
  return <TargetIcon />;
}
