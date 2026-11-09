import { useEffect, useState } from "react";
import type { IsoDateTime } from "../../../shared/types";
import { demoNowForRequests, isDemoMode } from "../../lib/clock";
import { nowInstant } from "./timeline";

const DEMO_NOW_KEY = "hallpass.demo_now";
const TICK_MS = 30_000;
const DEMO_WATCH_MS = 500;

function currentNow(): Date {
  return nowInstant(demoNowForRequests(), new Date());
}

/** Conference wall clock for Today. Refreshes on an interval and when the demo clock moves. */
export function useConferenceNow(): Date {
  const [now, setNow] = useState(currentNow);

  useEffect(() => {
    const sync = () => setNow(currentNow());
    sync();

    const tick = window.setInterval(sync, TICK_MS);

    let lastDemo: IsoDateTime | null = isDemoMode() ? demoNowForRequests() : null;
    const demoWatch = window.setInterval(() => {
      if (!isDemoMode()) {
        lastDemo = null;
        return;
      }
      const demo = demoNowForRequests();
      if (demo !== lastDemo) {
        lastDemo = demo;
        sync();
      }
    }, DEMO_WATCH_MS);

    const onStorage = (event: StorageEvent) => {
      if (event.key === DEMO_NOW_KEY || event.key === "hallpass.demo") sync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(demoWatch);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return now;
}
