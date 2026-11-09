import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Notice } from "./Notice";

export type AppTab = "today" | "plan" | "goals";

export interface AppFrameProps {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  /** Hide the tab bar on entry and on a focused adjustment screen. */
  showTabs?: boolean;
  /** Slot for the demo clock bar. This frame does not advance time. */
  demoBar?: ReactNode;
  /** Slot for an Ask Hallpass composer owned outside this shell. */
  ask?: ReactNode;
  children: ReactNode;
}

const TABS: { id: AppTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "plan", label: "Plan" },
  { id: "goals", label: "Goals" },
];

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  return online;
}

export function AppFrame({ tab, onTabChange, showTabs = true, demoBar, ask, children }: AppFrameProps) {
  const online = useOnline();

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col bg-surface sm:border-x sm:border-line">
        {demoBar ? demoBar : null}
        {online ? null : (
          <div className="px-4 pt-3">
            <Notice tone="offline" title="You're offline">
              What is already on this screen stays here. This preview does not send anything.
            </Notice>
          </div>
        )}
        <main id="content" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-5">
          {children}
        </main>
        {ask ? <div className="border-t border-line px-4 py-2">{ask}</div> : null}
        {showTabs ? (
          <nav
            aria-label="Sections"
            className="flex border-t border-line pb-[max(0.25rem,env(safe-area-inset-bottom))]"
          >
            {TABS.map((item) => {
              const selected = item.id === tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`min-h-12 flex-1 px-2 text-base font-semibold ${selected ? "text-action-quiet underline decoration-2 underline-offset-8" : "text-muted"}`}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => onTabChange(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
