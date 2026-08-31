"use client";

import * as React from "react";
import { nowTime } from "@/lib/utils";

/**
 * A ticking HH:mm clock. Re-renders on the interval rather than every second,
 * which is enough for countdowns measured in minutes.
 */
export function useClock(intervalMs = 30_000): string {
  const [time, setTime] = React.useState(nowTime);

  React.useEffect(() => {
    const tick = () => setTime(nowTime());
    tick();
    const id = setInterval(tick, intervalMs);
    // a phone that was asleep comes back with a stale clock
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return time;
}
