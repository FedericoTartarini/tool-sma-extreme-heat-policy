import type { DashboardForecastSnapshot } from "@/domain/dashboardForecast";
import type { ForecastApiPoint } from "@/api/heatRisk";
import {
  getNextWeeklyWindow,
  type ScheduledWindow,
  type WeeklyWindow,
} from "@/domain/weeklyWindow";
import { selectWeeklyWindowForecast } from "@/domain/weeklyWindowForecast";

export type WeeklyPreviewSource =
  | { status: "loading" | "unavailable" }
  | { status: "ok"; result: DashboardForecastSnapshot };

export type WeeklyPreviewResult =
  | {
      status: "ok";
      window: ScheduledWindow;
      points: ForecastApiPoint[];
      /** Set when only the part of the window from this instant is covered. */
      coveredFromUtc?: string;
    }
  | { status: "incomplete_forecast"; window: ScheduledWindow }
  | { status: "unresolved_local_time"; localDate: string; timeZone: string }
  | {
      status:
        | "loading"
        | "unavailable"
        | "invalid_time_zone"
        | "invalid_window"
        | "invalid_forecast";
    };

/**
 * The backend only returns forecast samples from about an hour before now, so
 * an in-progress window can lose its start hour. Returns the earliest sample's
 * instant when it is after the window start, at or before now and before the
 * window end; the window is then evaluated from there.
 */
function findInProgressCoverageStart(
  forecast: readonly ForecastApiPoint[],
  window: ScheduledWindow,
  now: Date,
): string | null {
  const start = Date.parse(window.startUtc);
  const end = Date.parse(window.endUtc);
  const nowMs = now.getTime();

  let earliest = Number.POSITIVE_INFINITY;
  for (const point of forecast) {
    const instant = Date.parse(point.time_utc);
    if (!Number.isFinite(instant)) return null;
    earliest = Math.min(earliest, instant);
  }

  return earliest > start && earliest <= nowMs && earliest < end
    ? new Date(earliest).toISOString()
    : null;
}

export function resolveWeeklyWindowPreview(
  draft: Omit<WeeklyWindow, "timeZone">,
  source: WeeklyPreviewSource,
  now: Date,
  options?: { includeInProgress?: boolean },
): WeeklyPreviewResult {
  if (source.status !== "ok") return { status: source.status };
  const { result } = source;
  if (result.forecast.length === 0) return { status: "unavailable" };
  if (!result.timezone) return { status: "invalid_time_zone" };
  const next = getNextWeeklyWindow(
    { ...draft, timeZone: result.timezone },
    now,
    options,
  );
  if (next.status === "invalid") {
    return {
      status:
        next.reason === "invalid_time_zone"
          ? "invalid_time_zone"
          : "invalid_window",
    };
  }
  if (next.status !== "ok") {
    return {
      status: "unresolved_local_time",
      localDate: next.localDate,
      timeZone: result.timezone,
    };
  }
  const coveredFromUtc = options?.includeInProgress
    ? findInProgressCoverageStart(result.forecast, next.window, now)
    : null;
  const selected = selectWeeklyWindowForecast(
    result.forecast,
    coveredFromUtc ? { ...next.window, startUtc: coveredFromUtc } : next.window,
  );
  if (selected.status === "ok") {
    return coveredFromUtc
      ? { ...selected, window: next.window, coveredFromUtc }
      : { ...selected, window: next.window };
  }
  if (selected.status === "incomplete_forecast")
    return { ...selected, window: next.window };
  return { status: selected.status };
}
