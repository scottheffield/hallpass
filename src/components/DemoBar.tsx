import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
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

/** One-line demo bar label: `Demo · Tue 12:05 PM · Controls`. */
export function buildDemoBarSummaryLabel(iso: IsoDateTime): string {
  const parts = splitDemoIso(iso);
  if (!parts) return "Demo · Controls";
  const day = formatDayShort(parts.day);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(iso));
  return `Demo · ${day} ${time} · Controls`;
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

  const summaryLabel = buildDemoBarSummaryLabel(picker.iso);

  const loadDemoAttendee = useCallback(async () => {
    setDemoError(null);
    setLoadingDemo(true);
    try {
      await post<DemoLoadResponse>("/api/demo/load", {});
      window.location.reload();
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Could not load demo attendee.");
    } finally {
      setLoadingDemo(false);
    }
  }, []);

  const commit = useCallback((day: EventDay, time: string) => {
    const wall = parseDemoWallTime(time);
    if (!wall) return;
    const iso = buildDemoIso(day, wall.hour, wall.minute);
    setDemoNow(iso);
    setPicker({ day, time, iso });
    setStatus(formatDemoNowLabel(iso));
    setExpanded(false);
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
    <Stack gap="sm">
      <button
        type="button"
        className="flex w-full min-h-10 items-center rounded-xl border border-line bg-canvas px-3 py-2 text-left text-sm font-semibold text-ink"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="min-w-0 truncate">{summaryLabel}</span>
      </button>

      {expanded ? (
        <Panel id={panelId}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 text-sm leading-snug text-muted" role="status" aria-live="polite">
              <span className="font-semibold text-ink">Demo time</span> {status}. Times are Mountain Time (
              <abbr title={EVENT_TIME_ZONE}>MT</abbr>, {EVENT_OFFSET}).
            </p>
            {stored ? null : (
              <p className="text-xs text-muted">Using default start until you pick a time.</p>
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
                    {loadingDemo ? "Loading demo attendee…" : "Load demo attendee"}
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
                Time in Mountain Time
              </label>
              <input
                id={timeId}
                name="demo-time"
                type="time"
                value={picker.time}
                className="min-h-12 w-full max-w-[11rem] rounded-xl border-2 border-line bg-surface px-3 text-base text-ink"
                onChange={(event) => commit(picker.day, event.target.value)}
              />
            </div>
          </CardRow>
        </Panel>
      ) : null}
    </Stack>
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
  return <div className="rounded-xl border border-line bg-canvas px-3 py-2.5">{children}</div>;
}
