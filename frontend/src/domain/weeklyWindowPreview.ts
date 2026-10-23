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
  | { status: "ok"; window: ScheduledWindow; points: ForecastApiPoint[] }
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
  const selected = selectWeeklyWindowForecast(result.forecast, next.window);
  if (selected.status === "ok") return { ...selected, window: next.window };
  if (selected.status === "incomplete_forecast")
    return { ...selected, window: next.window };
  return { status: selected.status };
}
