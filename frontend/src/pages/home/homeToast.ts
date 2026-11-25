import {
  toCalculationErrorI18nKey,
  toLocationErrorI18nKey,
  type HomeCalculationErrorReason,
  type HomeLocationErrorReason,
} from "@/domain/homeErrorMap";

export type HomeToastVariant = "success" | "error";

export interface HomeToastEvent {
  id: number;
  i18nKey: string;
  variant: HomeToastVariant;
  durationMs: number;
}

export const HOME_SUCCESS_TOAST_DURATION_MS = 3000;
export const HOME_ERROR_TOAST_DURATION_MS = 5000;

/**
 * Builds the success toast shown after a heat-risk forecast refresh.
 */
export function createForecastUpdatedToast(id: number): HomeToastEvent {
  return {
    id,
    i18nKey: "home.notifications.forecastUpdated",
    variant: "success",
    durationMs: HOME_SUCCESS_TOAST_DURATION_MS,
  };
}

/**
 * Builds the error toast shown when a heat-risk calculation fails.
 *
 * Returns `null` when the reason has no mapped user-facing message so callers
 * can silently ignore non-actionable failures.
 */
export function createCalculationErrorToast(
  id: number,
  reason: HomeCalculationErrorReason | null,
): HomeToastEvent | null {
  const i18nKey = toCalculationErrorI18nKey(reason);

  if (!i18nKey) {
    return null;
  }

  return {
    id,
    i18nKey,
    variant: "error",
    durationMs: HOME_ERROR_TOAST_DURATION_MS,
  };
}

/**
 * Builds the error toast shown when a location search or current-location
 * detection fails.
 *
 * Returns `null` when the reason has no mapped user-facing message so callers
 * can silently ignore non-actionable failures.
 */
export function createLocationErrorToast(
  id: number,
  reason: HomeLocationErrorReason | null,
): HomeToastEvent | null {
  const i18nKey = toLocationErrorI18nKey(reason);

  if (!i18nKey) {
    return null;
  }

  return {
    id,
    i18nKey,
    variant: "error",
    durationMs: HOME_ERROR_TOAST_DURATION_MS,
  };
}
