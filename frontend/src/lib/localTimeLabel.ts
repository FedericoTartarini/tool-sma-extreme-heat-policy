import {
  formatForecastMinutesLabel,
  parseForecastTimeToMinutes,
} from "@/lib/forecastTime";

const DEFAULT_TIME_LOCALE = "en-AU";

/**
 * Formats a backend local time label (HH:MM, 24-hour) with the forecast chart's time format.
 * Returns the input unchanged when it is not a valid HH:MM value.
 */
export function formatLocalTimeLabel(
  hourMinute24: string,
  locale: string = DEFAULT_TIME_LOCALE,
): string {
  const minutes = parseForecastTimeToMinutes(hourMinute24.trim());
  if (minutes === null) {
    return hourMinute24;
  }

  return formatForecastMinutesLabel(minutes, locale);
}
