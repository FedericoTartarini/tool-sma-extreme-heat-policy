export type DashboardToastVariant = "success" | "error";

export const DASHBOARD_SUCCESS_TOAST_DURATION_MS = 3000;
export const DASHBOARD_ERROR_TOAST_DURATION_MS = 5000;

export interface DashboardToastEvent {
  id: number;
  i18nKey: string;
  variant: DashboardToastVariant;
  durationMs?: number;
}

/**
 * Creates a short success toast after a scheduled dashboard refetch.
 */
export function createDashboardRiskUpdatedToast(
  id: number,
): DashboardToastEvent {
  return {
    id,
    i18nKey: "dashboard.notifications.riskUpdated",
    variant: "success",
    durationMs: DASHBOARD_SUCCESS_TOAST_DURATION_MS,
  };
}

/**
 * Creates an error toast when a scheduled dashboard refetch fails for every card.
 */
export function createDashboardRefreshFailedToast(
  id: number,
): DashboardToastEvent {
  return {
    id,
    i18nKey: "dashboard.notifications.refreshFailed",
    variant: "error",
    durationMs: DASHBOARD_ERROR_TOAST_DURATION_MS,
  };
}
