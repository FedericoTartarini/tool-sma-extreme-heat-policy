import type { ForecastApiPoint } from "@/api/heatRisk";
import type { ScheduledWindow } from "@/domain/weeklyWindow";
import { parseOffsetIsoDateTime } from "@/lib/offsetIsoDateTime";

export type WindowForecastResult =
  | { status: "ok"; points: ForecastApiPoint[] }
  | { status: "invalid_window" }
  | { status: "incomplete_forecast" }
  | { status: "invalid_forecast" };

const HOUR_MS = 3_600_000;

export interface WindowRiskSummary {
  averageRiskScore: number;
  minRiskScore: number;
  maxRiskScore: number;
}

/**
 * Summarizes the real forecast samples selected for a scheduled window.
 */
export function summarizeWeeklyWindowRisk(
  points: readonly ForecastApiPoint[],
): WindowRiskSummary | null {
  if (points.length === 0) {
    return null;
  }

  let total = 0;
  let minRiskScore = Number.POSITIVE_INFINITY;
  let maxRiskScore = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const score = point.heat_risk.risk_level_interpolated;
    if (!Number.isFinite(score)) {
      return null;
    }

    total += score;
    minRiskScore = Math.min(minRiskScore, score);
    maxRiskScore = Math.max(maxRiskScore, score);
  }

  return {
    averageRiskScore: total / points.length,
    minRiskScore,
    maxRiskScore,
  };
}

/**
 * Selects actual hourly samples inside the window, including both endpoints.
 * Samples at/before the start and at/after the end must bracket the whole
 * window without hourly gaps. Bracketing samples outside it are not returned.
 * This does not interpolate minute-level risks or define an average-risk rule.
 */
export function selectWeeklyWindowForecast(
  forecast: readonly ForecastApiPoint[],
  window: ScheduledWindow,
): WindowForecastResult {
  const start = Date.parse(window.startUtc);
  const end = Date.parse(window.endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { status: "invalid_window" };
  }

  const ordered = forecast.map((point) => ({
    point,
    instant: Date.parse(point.time_utc),
  }));
  if (ordered.some(({ instant }) => !Number.isFinite(instant))) {
    return { status: "invalid_forecast" };
  }
  ordered.sort((a, b) => a.instant - b.instant);
  if (
    ordered.some(
      ({ instant }, index) =>
        index > 0 && instant === ordered[index - 1].instant,
    )
  ) {
    return { status: "invalid_forecast" };
  }
  const firstAfterStart = ordered.findIndex(({ instant }) => instant > start);
  const left =
    firstAfterStart === -1 ? ordered.length - 1 : firstAfterStart - 1;
  const right = ordered.findIndex(({ instant }) => instant >= end);
  if (left < 0 || right < 0) return { status: "incomplete_forecast" };

  const covered = ordered.slice(left, right + 1);
  for (let index = 0; index < covered.length; index++) {
    const { point, instant } = covered[index];
    if (
      !Number.isFinite(point.heat_risk.risk_level_interpolated) ||
      !parseOffsetIsoDateTime(point.time_local) ||
      Date.parse(point.time_local) !== instant
    ) {
      return { status: "invalid_forecast" };
    }
    if (index > 0) {
      const gap = instant - covered[index - 1].instant;
      if (gap !== HOUR_MS) return { status: "incomplete_forecast" };
    }
  }
  const points = covered
    .filter(({ instant }) => instant >= start && instant <= end)
    .map(({ point }) => point);
  return points.length > 0
    ? { status: "ok", points }
    : { status: "incomplete_forecast" };
}
