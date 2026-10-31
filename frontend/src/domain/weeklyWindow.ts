export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeeklyWindow {
  weekdays: readonly Weekday[];
  startMinutes: number;
  endMinutes: number;
  timeZone: string;
}

export interface ScheduledWindow {
  localDate: string;
  timeZone: string;
  startUtc: string;
  endUtc: string;
}

export type WeeklyWindowValidationError =
  | "invalid_weekdays"
  | "invalid_minutes"
  | "unsupported_overnight_window"
  | "invalid_time_zone";

export type WeeklyWindowFieldsValidationError = Exclude<
  WeeklyWindowValidationError,
  "invalid_time_zone"
>;

export type NextWeeklyWindowResult =
  | { status: "ok"; window: ScheduledWindow }
  | {
      status: "invalid";
      reason: WeeklyWindowValidationError | "invalid_now";
    }
  | {
      status: "unresolved_local_time";
      reason: "nonexistent" | "ambiguous";
      localDate: string;
    };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function createLocalClock(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export type SameDayTimeRangeValidationError = Exclude<
  WeeklyWindowFieldsValidationError,
  "invalid_weekdays"
>;

export function validateSameDayTimeRange(
  startMinutes: number,
  endMinutes: number,
): SameDayTimeRangeValidationError | null {
  if (
    !Number.isInteger(startMinutes) ||
    !Number.isInteger(endMinutes) ||
    startMinutes < 0 ||
    startMinutes >= 1440 ||
    endMinutes <= 0 ||
    endMinutes > 1440 ||
    startMinutes === endMinutes
  ) {
    return "invalid_minutes";
  }
  if (endMinutes < startMinutes) {
    return "unsupported_overnight_window";
  }
  return null;
}

export function validateWeeklyWindowFields(
  window: Omit<WeeklyWindow, "timeZone">,
): WeeklyWindowFieldsValidationError | null {
  if (
    window.weekdays.length === 0 ||
    window.weekdays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    ) ||
    new Set(window.weekdays).size !== window.weekdays.length
  ) {
    return "invalid_weekdays";
  }

  return validateSameDayTimeRange(window.startMinutes, window.endMinutes);
}

export function validateWeeklyWindow(
  window: WeeklyWindow,
): WeeklyWindowValidationError | null {
  const fieldsError = validateWeeklyWindowFields(window);
  if (fieldsError) {
    return fieldsError;
  }

  try {
    if (window.timeZone.trim().length === 0) return "invalid_time_zone";
    createLocalClock(window.timeZone);
  } catch {
    return "invalid_time_zone";
  }
  return null;
}

// A wall-clock timestamp is a calendar value, not an actual UTC instant.
function wallClockAt(clock: Intl.DateTimeFormat, instant: number): number {
  const parts = clock.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
  );
}

function resolveWallClock(
  clock: Intl.DateTimeFormat,
  wallTime: number,
): number[] {
  const offsets = new Set<number>();
  // Sample both sides of nearby transitions, including non-hour DST changes.
  for (let hours = -48; hours <= 48; hours += 6) {
    const instant = wallTime + hours * HOUR_MS;
    offsets.add(wallClockAt(clock, instant) - instant);
  }
  return [...offsets]
    .map((offset) => wallTime - offset)
    .filter((instant) => wallClockAt(clock, instant) === wallTime)
    .sort((a, b) => a - b);
}

type ScheduledWindowResolutionResult =
  | { status: "ok"; window: ScheduledWindow }
  | {
      status: "unresolved_local_time";
      reason: "nonexistent" | "ambiguous";
      localDate: string;
    };

function scheduledWindowForLocalDay(
  clock: Intl.DateTimeFormat,
  dayEpoch: number,
  localDate: string,
  timeZone: string,
  startMinutes: number,
  endMinutes: number,
): ScheduledWindowResolutionResult {
  const startWall = dayEpoch + startMinutes * MINUTE_MS;
  const startInstants = resolveWallClock(clock, startWall);
  const endInstants = resolveWallClock(
    clock,
    dayEpoch + endMinutes * MINUTE_MS,
  );

  if (startInstants.length !== 1 || endInstants.length !== 1) {
    return {
      status: "unresolved_local_time",
      reason:
        startInstants.length === 0 || endInstants.length === 0
          ? "nonexistent"
          : "ambiguous",
      localDate,
    };
  }

  return {
    status: "ok",
    window: {
      localDate,
      timeZone,
      startUtc: new Date(startInstants[0]).toISOString(),
      endUtc: new Date(endInstants[0]).toISOString(),
    },
  };
}

/**
 * Resolves the next window whose start is at or after now, in the location's
 * timezone. Already-started windows roll forward unless `includeInProgress`
 * is set, in which case a window is kept until its end is before now.
 * DST gaps/folds are returned explicitly; callers must not silently shift a
 * user's selected time. End minute 1440 means midnight following the selected
 * weekday.
 */
export function getNextWeeklyWindow(
  window: WeeklyWindow,
  now: Date,
  options?: { includeInProgress?: boolean },
): NextWeeklyWindowResult {
  const reason = validateWeeklyWindow(window);
  if (reason) return { status: "invalid", reason };
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) {
    return { status: "invalid", reason: "invalid_now" };
  }

  const clock = createLocalClock(window.timeZone);
  const localNow = wallClockAt(clock, nowMs);
  const localMidnight = Math.floor(localNow / DAY_MS) * DAY_MS;

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const day = localMidnight + dayOffset * DAY_MS;
    if (!window.weekdays.includes(new Date(day).getUTCDay() as Weekday))
      continue;

    const startWall = day + window.startMinutes * MINUTE_MS;
    const startInstants = resolveWallClock(clock, startWall);
    const boundaryWall = options?.includeInProgress
      ? day + window.endMinutes * MINUTE_MS
      : startWall;
    const boundaryInstants = options?.includeInProgress
      ? resolveWallClock(clock, boundaryWall)
      : startInstants;
    if (
      boundaryInstants.length > 0
        ? boundaryInstants.every((instant) => instant < nowMs)
        : boundaryWall < localNow
    ) {
      continue;
    }

    const localDate = new Date(day).toISOString().slice(0, 10);
    const resolved = scheduledWindowForLocalDay(
      clock,
      day,
      localDate,
      window.timeZone,
      window.startMinutes,
      window.endMinutes,
    );
    if (resolved.status !== "ok") {
      return resolved;
    }
    return resolved;
  }
  // A valid weekday always occurs within the inclusive eight-day search.
  throw new Error("Could not resolve a validated weekly window");
}
