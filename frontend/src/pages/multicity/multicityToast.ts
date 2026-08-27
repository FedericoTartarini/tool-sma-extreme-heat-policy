export type MulticityToastVariant = "success" | "error";

export const MULTICITY_SUCCESS_TOAST_DURATION_MS = 3000;

export interface MulticityToastEvent {
  id: number;
  i18nKey: string;
  variant: MulticityToastVariant;
  durationMs?: number;
}

/**
 * Creates a short success toast after a scheduled dashboard refetch.
 */
export function createMulticityRiskUpdatedToast(
  id: number,
): MulticityToastEvent {
  return {
    id,
    i18nKey: "multicity.notifications.riskUpdated",
    variant: "success",
    durationMs: MULTICITY_SUCCESS_TOAST_DURATION_MS,
  };
}
