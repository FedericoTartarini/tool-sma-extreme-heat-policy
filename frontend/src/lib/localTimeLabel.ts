const LOCAL_HOUR_MINUTE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Formats a backend local time label (HH:MM, 24-hour) for display (12-hour).
 * Returns the input unchanged when it is not a valid HH:MM value.
 */
export function formatLocalTimeLabel(hourMinute24: string): string {
  const match = LOCAL_HOUR_MINUTE_PATTERN.exec(hourMinute24.trim());
  if (!match) {
    return hourMinute24;
  }

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  if (minute === 0) {
    return `${hour12} ${meridiem}`;
  }

  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}
