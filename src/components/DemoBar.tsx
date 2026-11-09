import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { EVENT_DAYS, EVENT_OFFSET, EVENT_TIME_ZONE, type EventDay } from "../../shared/event";
import type { IsoDateTime } from "../../shared/types";
import {
  defaultDemoNow,
  demoNowForRequests,
  getDemoNow,
  isDemoMode,
  setDemoNow,
} from "../lib/clock";
import type { DemoLoadResponse } from "../../shared/api";
import { post } from "../lib/api";
import { clearDemoAttendeeLocalStorage } from "../lib/reset";
import { Button } from "../ui/Button";
import { Stack } from "../ui/Stack";
import {
  buildDemoIso,
  formatDayLong,
  formatDayShort,
  formatDemoNowLabel,
  formatDemoWallTime,
  parseDemoWallTime,
  splitDemoIso,
} from "./demo/time";

function initialPicker(): { day: EventDay; time: string; iso: IsoDateTime } {
  const iso = demoNowForRequests() ?? defaultDemoNow();
  const parts = splitDemoIso(iso);
  if (!parts) {
    return { day: EVENT_DAYS[0], time: "09:00", iso: defaultDemoNow() };
  }
  return {
    day: parts.day,
    time: formatDemoWallTime(parts.hour, parts.minute),
    iso,
  };
}

/** Demo clock segment for the collapsed bar, for example `Tue 12:05 PM`. */
export function buildDemoBarTimeLabel(iso: IsoDateTime): string {
  const parts = splitDemoIso(iso);
  if (!parts) return "";
  const day = formatDayShort(parts.day);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(iso));
  return `${day} ${time}`;
}

/** Accessible name for the collapsed presenter-controls toggle. */
export function buildDemoBarAccessibleLabel(iso: IsoDateTime): string {
  const time = buildDemoBarTimeLabel(iso);
  if (!time) return "Presenter controls, demo clock";
  return `Presenter controls, demo clock ${time}`;
}

function DemoOnlyChip() {
  return (
    <span className="shrink-0 rounded-full border border-canvas px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-canvas">
      Demo only
    </span>
  );
}

/** Demo clock controls. Mount in AppFrame when demo mode is on. */
export function DemoBar() {
  const timeId = useId();
  const panelId = useId();
  const [picker, setPicker] = useState(initialPicker);
  const [status, setStatus] = useState(() => formatDemoNowLabel(picker.iso));
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasExpandedRef = useRef(expanded);

  const timeLabel = buildDemoBarTimeLabel(picker.iso);
  const accessibleLabel = buildDemoBarAccessibleLabel(picker.iso);

  const collapsePanel = useCallback(() => {
    setExpanded(false);
  }, []);

  useEffect(() => {
    if (wasExpandedRef.current && !expanded) {
      toggleRef.current?.focus();
    }
    wasExpandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      collapsePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, collapsePanel]);

  const loadDemoAttendee = useCallback(async () => {
    setDemoError(null);
    setLoadingDemo(true);
    collapsePanel();
    try {
      await post<DemoLoadResponse>("/api/demo/load", {});
      window.location.reload();
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Could not load demo attendee.");
      setExpanded(true);
    } finally {
      setLoadingDemo(false);
    }
  }, [collapsePanel]);

  const commit = useCallback((day: EventDay, time: string) => {
    const wall = parseDemoWallTime(time);
    if (!wall) return;
    const iso = buildDemoIso(day, wall.hour, wall.minute);
    setDemoNow(iso);
    setPicker({ day, time, iso });
    setStatus(formatDemoNowLabel(iso));
  }, []);

  const confirmStartOver = useCallback(() => {
    try {
      clearDemoAttendeeLocalStorage(localStorage);
    } catch {
      /* private mode */
    }
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!isDemoMode()) return;

    const sync = () => {
      const iso = demoNowForRequests();
      if (!iso) return;
      const parts = splitDemoIso(iso);
      if (!parts) return;
      const time = formatDemoWallTime(parts.hour, parts.minute);
      setPicker({ day: parts.day, time, iso });
      setStatus(formatDemoNowLabel(iso));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "hallpass.demo_now" || event.key === "hallpass.demo") sync();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!isDemoMode()) return null;

  const stored = getDemoNow();

  return (
    <div className="border-b-2 border-dashed border-canvas bg-ink text-canvas">
      <div className="px-4 py-2">
      <Stack gap="sm">
        <button
          ref={toggleRef}
          type="button"
          className="flex w-full min-h-10 items-center gap-2 py-1 text-left text-sm font-semibold text-canvas"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={accessibleLabel}
          onClick={() => setExpanded((open) => !open)}
        >
          <DemoOnlyChip />
          <span className="shrink-0">Presenter controls</span>
          {timeLabel ? (
            <>
              <span aria-hidden="true" className="shrink-0 text-canvas">
                ·
              </span>
              <span className="min-w-0 truncate font-normal">{timeLabel}</span>
            </>
          ) : null}
          <span aria-hidden="true" className="ml-auto shrink-0">
            {expanded ? "▴" : "▾"}
          </span>
        </button>

        {expanded ? (
          <Panel id={panelId}>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-canvas">Presenter controls</h2>
              <p className="text-sm text-canvas">For the demo only. Attendees never see this.</p>
              <p className="sr-only" role="status" aria-live="polite">
                Demo time {status}. Times are Mountain Time, {EVENT_OFFSET}.
              </p>
              {stored ? null : (
                <p className="text-xs text-canvas">Using default start until you pick a time.</p>
              )}
            </div>

            <CardRow>
              <fieldset className="m-0 min-w-0 flex-1 border-0 p-0">
                <legend className="mb-1.5 text-sm font-semibold text-ink">Conference day</legend>
                <div className="flex flex-wrap gap-2">
                  {EVENT_DAYS.map((day) => {
                    const selected = picker.day === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={selected}
                        className={`min-h-10 rounded-xl border-2 px-3 text-sm font-semibold ${selected ? "border-badge bg-badge text-on-badge" : "border-line bg-surface text-ink"}`}
                        onClick={() => {
                          if (day === picker.day) return;
                          commit(day, picker.time);
                          collapsePanel();
                        }}
                      >
                        <span className="sr-only">{formatDayLong(day)}</span>
                        <span aria-hidden="true">{formatDayShort(day)}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </CardRow>

            <CardRow>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {startOverOpen ? (
                  <div className="flex flex-col gap-2" role="group" aria-label="Start over confirmation">
                    <p className="text-sm text-ink">Start over? This clears this browser&apos;s attendee.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={confirmStartOver}>
                        Start over
                      </Button>
                      <Button type="button" variant="quiet" onClick={() => setStartOverOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={loadingDemo}
                      onClick={() => void loadDemoAttendee()}
                    >
                      {loadingDemo ? "Loading sample attendee…" : "Load sample attendee"}
                    </Button>
                    <Button type="button" variant="quiet" disabled={loadingDemo} onClick={() => setStartOverOpen(true)}>
                      Start over
                    </Button>
                  </div>
                )}
                {demoError ? (
                  <p className="text-sm text-error" role="alert">
                    {demoError}
                  </p>
                ) : null}
              </div>
            </CardRow>

            <CardRow>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor={timeId} className="text-sm font-semibold text-ink">
                  Time in Mountain Time (
                  <abbr title={EVENT_TIME_ZONE}>MT</abbr>, {EVENT_OFFSET})
                </label>
                <input
                  id={timeId}
                  name="demo-time"
                  type="time"
                  value={picker.time}
                  className="min-h-12 w-full max-w-[11rem] rounded-xl border-2 border-line bg-surface px-3 text-base text-ink"
                  onChange={(event) => commit(picker.day, event.target.value)}
                  onBlur={() => collapsePanel()}
                />
              </div>
            </CardRow>
          </Panel>
        ) : null}
      </Stack>
      </div>
    </div>
  );
}

function Panel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id}>
      <Stack gap="sm">{children}</Stack>
    </div>
  );
}

function CardRow({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface px-3 py-2.5">{children}</div>;
}
