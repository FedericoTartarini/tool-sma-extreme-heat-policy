import type { HeatRiskErrorReason } from "@/api/heatRisk";
import type { DashboardHeatRiskLocationErrorCode } from "@/api/dashboardHeatRiskQuery";

const DASHBOARD_FETCH_ERROR_I18N_KEY_BY_REASON: Record<
  HeatRiskErrorReason,
  string
> = {
  missing_config: "errors.risk.missingApiBaseUrl",
  abort: "errors.risk.network",
  http_status: "errors.risk.network",
  invalid_response: "errors.risk.invalidResponse",
  network: "errors.risk.network",
  weather_provider_unavailable: "errors.risk.weatherProvider",
};

const DASHBOARD_LOCATION_ERROR_I18N_KEY_BY_CODE: Record<
  DashboardHeatRiskLocationErrorCode | "risk_calculation_failed",
  string
> = {
  unknown_inputs: "dashboard.cardErrors.unknownInputs",
  risk_calculation_failed: "dashboard.cardErrors.riskCalculationFailed",
};

/**
 * Maps a dashboard card fetch failure to an i18n key.
 */
export function toDashboardFetchErrorI18nKey(
  reason: HeatRiskErrorReason | null,
): string | null {
  if (!reason) {
    return null;
  }

  return DASHBOARD_FETCH_ERROR_I18N_KEY_BY_REASON[reason] ?? null;
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
