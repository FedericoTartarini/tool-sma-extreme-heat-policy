import { parseOffsetIsoDateTime } from "@/lib/offsetIsoDateTime";

/** Preserve the backend's local wall clock rather than converting it again. */
export function formatWeeklyForecastTime(timeLocal: string, locale: string) {
  const parts = parseOffsetIsoDateTime(timeLocal);
  if (!parts) return null;
  return {
    dateKey: parts.dateKey,
    label: new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(`${parts.dateKey}T${parts.timeLabel}:00Z`)),
  };
}
