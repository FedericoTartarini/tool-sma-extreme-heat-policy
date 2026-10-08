const FORECAST_HOUR_MINUTE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINUTES_IN_DAY = 24 * 60;
const MS_IN_MINUTE = 60_000;

/** Any date works: only the time of day is ever formatted, always read as UTC. */
const FORECAST_TIME_BASE = Date.UTC(2000, 0, 1);

const forecastTimeFormats = new Map<string, Intl.DateTimeFormat>();

function getForecastTimeFormat(
  locale: string,
  withMinutes: boolean,
): Intl.DateTimeFormat {
  const key = `${locale}|${withMinutes}`;
  const cached = forecastTimeFormats.get(key);

  if (cached) {
    return cached;
  }

  const options: Intl.DateTimeFormatOptions = withMinutes
    ? { hour: "numeric", minute: "2-digit", timeZone: "UTC" }
    : { hour: "numeric", timeZone: "UTC" };

  let format: Intl.DateTimeFormat;

  try {
    format = new Intl.DateTimeFormat(locale, options);
  } catch {
    format = new Intl.DateTimeFormat(undefined, options);
  }

  forecastTimeFormats.set(key, format);

  return format;
}

/**
 * Parses a backend `HH:MM` forecast label into minutes past local midnight.
 *
 * Returns null when the label is not a well-formed 24-hour time.
 */
export function parseForecastTimeToMinutes(rawTime: string): number | null {
  const match = FORECAST_HOUR_MINUTE_PATTERN.exec(rawTime);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Formats minutes past local midnight for display, wrapping across days.
 *
 * The clock convention follows the locale, so the chart axis and the
 * screen-reader text read the same way in whichever language is selected.
 * Whole hours drop the minutes, which keeps axis ticks short.
 */
export function formatForecastMinutesLabel(
  rawMinutes: number,
  locale: string,
): string {
  const roundedMinutes = Math.round(rawMinutes);
  const normalizedMinutes =
    ((roundedMinutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

  return getForecastTimeFormat(locale, normalizedMinutes % 60 !== 0).format(
    FORECAST_TIME_BASE + normalizedMinutes * MS_IN_MINUTE,
  );
}

/**
 * One forecast label, separated into where it plots and what it says.
 *
 * `minuteOffset` is forced to keep increasing so that a label which repeats
 * (the hour that comes back when daylight saving ends) or fails to parse still
 * lands after its predecessor on the axis. `statedMinutes` keeps the time the
 * label itself gives, so text that quotes an hour quotes the real one rather
 * than the shifted coordinate. It is null when the label did not parse.
 */
export interface ForecastTimePoint {
  minuteOffset: number;
  statedMinutes: number | null;
}

/**
 * Maps a day's `HH:MM` forecast labels onto chart coordinates and stated times.
 */
export function toForecastTimePoints(
  times: readonly string[],
): ForecastTimePoint[] {
  let previousMinuteOffset = -1;

  return times.map((time) => {
    const statedMinutes = parseForecastTimeToMinutes(time);
    const minuteOffset =
      statedMinutes !== null && statedMinutes > previousMinuteOffset
        ? statedMinutes
        : previousMinuteOffset < 0
          ? (statedMinutes ?? 0)
          : previousMinuteOffset + 60;

    previousMinuteOffset = minuteOffset;

    return { minuteOffset, statedMinutes };
  });
}
