const OFFSET_ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?([+-]\d{2}:\d{2})$/;

export interface OffsetIsoDateTimeParts {
  dateKey: string;
  timeLabel: string;
}

/**
 * Parses an ISO-8601 datetime string with an explicit numeric offset.
 */
export function parseOffsetIsoDateTime(
  value: unknown,
): OffsetIsoDateTimeParts | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const match = OFFSET_ISO_DATE_TIME_PATTERN.exec(value);

  if (!match || Number.isNaN(Date.parse(value))) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;

  return {
    dateKey: `${year}-${month}-${day}`,
    timeLabel: `${hour}:${minute}`,
  };
}
