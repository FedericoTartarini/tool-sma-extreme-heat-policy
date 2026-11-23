import {
  validateWeeklyWindowFields,
  type Weekday,
} from "@/domain/weeklyWindow";

export interface DashboardOtherPeriodDraft {
  weekday: Weekday | null;
  startMinutes: number | null;
  endMinutes: number | null;
}

export interface DashboardOtherPeriodSelection {
  weekday: Weekday;
  startMinutes: number;
  endMinutes: number;
}

export type ResolvedDashboardOtherPeriodDraft =
  | { status: "empty" }
  | { status: "incomplete" }
  | {
      status: "invalid";
      reason:
        | "invalid_weekdays"
        | "invalid_minutes"
        | "unsupported_overnight_window";
    }
  | { status: "complete"; selection: DashboardOtherPeriodSelection };

export const DEFAULT_DASHBOARD_OTHER_PERIOD_START_MINUTES = 9 * 60;
export const DEFAULT_DASHBOARD_OTHER_PERIOD_END_MINUTES = 12 * 60;

/**
 * Resolves the dashboard other-period picker draft into a validated selection.
 */
export function resolveDashboardOtherPeriodDraft(
  draft: DashboardOtherPeriodDraft | undefined,
): ResolvedDashboardOtherPeriodDraft {
  if (!draft) {
    return { status: "empty" };
  }

  const hasWeekday = draft.weekday !== null;
  const hasStart = draft.startMinutes !== null;
  const hasEnd = draft.endMinutes !== null;

  if (!hasWeekday && !hasStart && !hasEnd) {
    return { status: "empty" };
  }

  if (
    draft.weekday === null ||
    draft.startMinutes === null ||
    draft.endMinutes === null
  ) {
    return { status: "incomplete" };
  }

  const validationError = validateWeeklyWindowFields({
    weekdays: [draft.weekday],
    startMinutes: draft.startMinutes,
    endMinutes: draft.endMinutes,
  });

  if (validationError) {
    return { status: "invalid", reason: validationError };
  }

  return {
    status: "complete",
    selection: {
      weekday: draft.weekday,
      startMinutes: draft.startMinutes,
      endMinutes: draft.endMinutes,
    },
  };
}

function isHourlyTimeOption(minutes: number, bound: "start" | "end"): boolean {
  if (!Number.isInteger(minutes) || minutes % 60 !== 0) {
    return false;
  }

  if (bound === "start") {
    return minutes >= 0 && minutes < 1440;
  }

  return minutes > 0 && minutes <= 1440;
}

/**
 * Accepts a saved picker draft when every set field is one the controls can
 * show. A partial draft is kept when its empty fields are null.
 */
export function isRestorableDashboardOtherPeriodDraft(
  draft: DashboardOtherPeriodDraft,
): boolean {
  if (
    draft.startMinutes !== null &&
    !isHourlyTimeOption(draft.startMinutes, "start")
  ) {
    return false;
  }

  if (
    draft.endMinutes !== null &&
    !isHourlyTimeOption(draft.endMinutes, "end")
  ) {
    return false;
  }

  return resolveDashboardOtherPeriodDraft(draft).status !== "invalid";
}

/**
 * Builds the initial other-period draft using the browser-local weekday.
 */
export function createDefaultDashboardOtherPeriodDraft(
  now = new Date(),
): DashboardOtherPeriodDraft {
  return {
    weekday: now.getDay() as Weekday,
    startMinutes: DEFAULT_DASHBOARD_OTHER_PERIOD_START_MINUTES,
    endMinutes: DEFAULT_DASHBOARD_OTHER_PERIOD_END_MINUTES,
  };
}
