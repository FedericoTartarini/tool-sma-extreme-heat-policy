import type { HeatRiskErrorReason } from "@/api/heatRisk";
import type { DashboardHeatRiskLocationErrorCode } from "@/api/dashboardHeatRiskQuery";
import { toCalculationErrorI18nKey } from "@/domain/homeErrorMap";

const DASHBOARD_LOCATION_ERROR_I18N_KEY_BY_CODE: Record<
  DashboardHeatRiskLocationErrorCode | "risk_calculation_failed",
  string
> = {
  unknown_inputs: "dashboard.cardErrors.unknownInputs",
  risk_calculation_failed: "dashboard.cardErrors.riskCalculationFailed",
};

/**
 * Maps a dashboard card fetch failure to an i18n key, shared with Home.
 */
export function toDashboardFetchErrorI18nKey(
  reason: HeatRiskErrorReason | null,
): string | null {
  return toCalculationErrorI18nKey(reason);
}

/**
 * Maps a dashboard card location/calculation error code to an i18n key.
 */
export function toDashboardLocationErrorI18nKey(
  errorCode:
    | DashboardHeatRiskLocationErrorCode
    | "risk_calculation_failed"
    | null,
): string {
  if (errorCode && DASHBOARD_LOCATION_ERROR_I18N_KEY_BY_CODE[errorCode]) {
    return DASHBOARD_LOCATION_ERROR_I18N_KEY_BY_CODE[errorCode];
  }

  return "dashboard.cardErrors.generic";
}
