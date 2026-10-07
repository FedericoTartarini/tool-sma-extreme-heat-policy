import { formatForecastMinutesLabel } from "@/lib/riskCharts";

const LOCAL_HOUR_MINUTE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Formats a backend local time label (HH:MM, 24-hour) with the forecast chart's time format.
 * Returns the input unchanged when it is not a valid HH:MM value.
 */
export function formatLocalTimeLabel(hourMinute24: string): string {
  const match = LOCAL_HOUR_MINUTE_PATTERN.exec(hourMinute24.trim());
  if (!match) {
    return hourMinute24;
  }

  return formatForecastMinutesLabel(Number(match[1]) * 60 + Number(match[2]));
}
