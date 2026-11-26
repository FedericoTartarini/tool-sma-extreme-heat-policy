import {
  formatForecastMinutesLabel,
  parseForecastTimeToMinutes,
} from "@/lib/forecastTime";

/**
 * Formats a backend local time label (HH:MM, 24-hour) with the forecast chart's time format.
 * The clock style follows the language: `en-AU` shows "2 pm", `zh-CN` shows "14时".
 * Returns the input unchanged when it is not a valid HH:MM value.
 */
export function formatLocalTimeLabel(
  hourMinute24: string,
  locale: string,
): string {
  const minutes = parseForecastTimeToMinutes(hourMinute24.trim());
  if (minutes === null) {
    return hourMinute24;
  }

  return formatForecastMinutesLabel(minutes, locale);
}
