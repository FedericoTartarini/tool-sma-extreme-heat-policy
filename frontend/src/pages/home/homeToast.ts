import {
  toCalculationErrorI18nKey,
  toSuggestErrorI18nKey,
  type HomeCalculationErrorReason,
  type HomeSuggestErrorReason,
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

export function createForecastUpdatedToast(id: number): HomeToastEvent {
  return {
    id,
    i18nKey: "home.notifications.forecastUpdated",
    variant: "success",
    durationMs: HOME_SUCCESS_TOAST_DURATION_MS,
  };
}

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

export function createSuggestErrorToast(
  id: number,
  reason: HomeSuggestErrorReason | null,
): HomeToastEvent | null {
  const i18nKey = toSuggestErrorI18nKey(reason);

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
