import {
  formatForecastMinutesLabel,
  parseForecastTimeToMinutes,
} from "@/lib/riskCharts";

/**
 * Formats a backend local time label (HH:MM, 24-hour) with the forecast chart's time format.
 * Returns the input unchanged when it is not a valid HH:MM value.
 */
export function formatLocalTimeLabel(hourMinute24: string): string {
  const minutes = parseForecastTimeToMinutes(hourMinute24.trim());
  if (minutes === null) {
    return hourMinute24;
  }

  return formatForecastMinutesLabel(minutes);
}
