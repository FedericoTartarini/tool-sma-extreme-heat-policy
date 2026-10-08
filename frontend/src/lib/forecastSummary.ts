import { toRiskLevel, type ForecastPoint, type RiskLevel } from "@/domain/risk";
import {
  formatForecastMinutesLabel,
  toForecastTimePoints,
} from "@/lib/forecastTime";

/**
 * One hour of the forecast, expressed for a screen-reader text alternative.
 *
 * `time` is a localised display label (for example `2 pm`), `level` the risk
 * band, and `score` the raw risk score. Note this is the score itself, not the
 * shifted coordinate the chart plots.
 */
export interface ForecastSummaryRow {
  time: string;
  level: RiskLevel;
  score: number;
}

/**
 * The rows a one-line summary of the day quotes: its highest-risk hour, and the
 * hours it opens and closes on.
 */
export interface ForecastSummaryEndpoints {
  peak: ForecastSummaryRow;
  first: ForecastSummaryRow;
  last: ForecastSummaryRow;
}

/**
 * Structured source for a forecast chart's text alternative.
 *
 * Holds no copy: the caller turns these values into sentences through i18n so
 * the summary stays translatable. `endpoints` is null exactly when the day has
 * no points, so one check tells the caller whether a summary can be written.
 */
export interface ForecastSummary {
  rows: ForecastSummaryRow[];
  endpoints: ForecastSummaryEndpoints | null;
}

/**
 * Derives the screen-reader summary for one forecast day (issue #71).
 *
 * The UI feeds these values into `charts.forecast.a11y.*`:
 * `chartLabel` for the one-line `aria-label`, and `tableCaption` plus the
 * `timeHeader` / `levelHeader` / `valueHeader` column labels for the visually
 * hidden hourly table.
 *
 * Points retain their forecast order, and ties resolve to the first occurrence,
 * comparing raw scores before rounding. Each row is labelled with the time its
 * own point states, so an hour that repeats when daylight saving ends reads as
 * itself rather than as the position the chart had to shift it to.
 */
export function buildForecastSummary(
  points: ForecastPoint[],
  locale: string,
): ForecastSummary {
  const timePoints = toForecastTimePoints(points.map((point) => point.time));
  let peakIndex = -1;

  const rows = points.map((point, index): ForecastSummaryRow => {
    if (peakIndex === -1 || point.value > points[peakIndex].value) {
      peakIndex = index;
    }

    const { minuteOffset, statedMinutes } = timePoints[index];

    return {
      time: formatForecastMinutesLabel(statedMinutes ?? minuteOffset, locale),
      level: toRiskLevel(point.value),
      score: point.value,
    };
  });

  const peak = rows[peakIndex];
  const first = rows[0];
  const last = rows.at(-1);

  return {
    rows,
    endpoints: peak && first && last ? { peak, first, last } : null,
  };
}
