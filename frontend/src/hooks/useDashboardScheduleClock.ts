import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

/**
 * Keeps schedule calculations aligned to minute boundaries and refreshes them
 * when a suspended tab becomes active again.
 */
export function useDashboardScheduleClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshClock();
      }
    };
    const currentTime = Date.now();
    const millisecondsUntilNextMinute =
      MINUTE_MS - (currentTime % MINUTE_MS) + 1;
    const timer = window.setTimeout(refreshClock, millisecondsUntilNextMinute);

    window.addEventListener("focus", refreshClock);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshClock);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [now]);

  return now;
}
