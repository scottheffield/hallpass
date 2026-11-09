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
import { Button } from "../ui/Button";
import { HelloMark } from "../ui/HelloMark";
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

/** Demo clock controls. Mount in AppFrame when demo mode is on. */
export function DemoBar() {
  const timeId = useId();
  const [picker, setPicker] = useState(initialPicker);
  const [status, setStatus] = useState(() => formatDemoNowLabel(picker.iso));
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <HelloMark compact />
          <p className="text-sm leading-snug text-muted" role="status" aria-live="polite">
            <span className="font-semibold text-ink">Demo time</span> {status}. Times are Mountain Time (
            <abbr title={EVENT_TIME_ZONE}>MT</abbr>, {EVENT_OFFSET}).
          </p>
        </div>
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
          <Button
            type="button"
            variant="secondary"
            disabled={loadingDemo}
            onClick={() => void loadDemoAttendee()}
          >
            {loadingDemo ? "Loading demo attendee…" : "Load demo attendee"}
          </Button>
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
    </Stack>
  );
}

function CardRow({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-canvas px-3 py-2.5">{children}</div>;
}
