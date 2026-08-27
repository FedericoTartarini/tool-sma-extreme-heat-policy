import type { BatchHeatRiskLocationResult } from "@/api/heatRiskBatch";
import type { RiskLevel } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import { toCoordinateKey, type SavedLocation } from "@/domain/multicity";

export type MulticityBatchFetchErrorReason =
  | "missing_config"
  | "abort"
  | "http_status"
  | "invalid_response"
  | "network"
  | "weather_provider_unavailable";

export type MulticityCityCardState =
  | { status: "loading" }
  | {
      status: "batch_error";
      reason: MulticityBatchFetchErrorReason;
    }
  | {
      status: "location_error";
      errorCode: string | null;
      detail: string | null;
    }
  | {
      status: "missing_result";
    }
  | {
      status: "ok";
      currentRiskLevel: RiskLevel;
      todayMaxRiskLevel: RiskLevel;
    };

const MULTICITY_CARD_ERROR_I18N_KEY_BY_CODE: Record<string, string> = {
  weather_provider_unavailable: "errors.risk.weatherProvider",
  unknown_inputs: "multicity.cardErrors.unknownInputs",
  risk_calculation_failed: "multicity.cardErrors.riskCalculationFailed",
};

const MULTICITY_BATCH_ERROR_I18N_KEY_BY_REASON: Record<
  MulticityBatchFetchErrorReason,
  string
> = {
  missing_config: "errors.risk.missingApiBaseUrl",
  abort: "errors.risk.network",
  http_status: "errors.risk.network",
  invalid_response: "errors.risk.invalidResponse",
  network: "errors.risk.network",
  weather_provider_unavailable: "errors.risk.weatherProvider",
};

/**
 * Builds a stable React Query key segment from saved dashboard coordinates.
 *
 * Order is ignored so reordering cities does not refetch the same set.
 */
export function buildMulticityLocationCoordsKey(
  locations: readonly Pick<SavedLocation, "latitude" | "longitude">[],
): string {
  return locations
    .map((location) => toCoordinateKey(location.latitude, location.longitude))
    .sort()
    .join(";");
}

/**
 * Indexes batch location results by normalized coordinate key.
 */
export function indexBatchResultsByCoordinateKey(
  results: readonly BatchHeatRiskLocationResult[],
): Map<string, BatchHeatRiskLocationResult> {
  const indexedResults = new Map<string, BatchHeatRiskLocationResult>();

  for (const result of results) {
    indexedResults.set(
      toCoordinateKey(result.latitude, result.longitude),
      result,
    );
  }

  return indexedResults;
}

/**
 * Maps a per-location batch error code to an i18n key.
 */
export function toMulticityCardErrorI18nKey(errorCode: string | null): string {
  if (errorCode && MULTICITY_CARD_ERROR_I18N_KEY_BY_CODE[errorCode]) {
    return MULTICITY_CARD_ERROR_I18N_KEY_BY_CODE[errorCode];
  }

  return "multicity.cardErrors.generic";
}

/**
 * Maps a whole-batch fetch failure reason to an i18n key.
 */
export function toMulticityBatchErrorI18nKey(
  reason: MulticityBatchFetchErrorReason,
): string {
  return MULTICITY_BATCH_ERROR_I18N_KEY_BY_REASON[reason];
}

/**
 * Resolves a saved location's card state from an indexed batch response.
 */
export function resolveMulticityCityCardState(
  location: SavedLocation,
  indexedResults: Map<string, BatchHeatRiskLocationResult> | null,
  options?: { isFetching?: boolean },
): MulticityCityCardState {
  const isFetching = options?.isFetching === true;

  if (!indexedResults) {
    return { status: isFetching ? "loading" : "missing_result" };
  }

  const batchResult = indexedResults.get(
    toCoordinateKey(location.latitude, location.longitude),
  );

  if (!batchResult) {
    return { status: isFetching ? "loading" : "missing_result" };
  }

  if (batchResult.status === "error") {
    return {
      status: "location_error",
      errorCode: batchResult.error_code,
      detail: batchResult.detail,
    };
  }

  const currentRisk = batchResult.current_risk_level_interpolated;
  const todayMaxRisk = batchResult.today_max_risk_level_interpolated;

  if (currentRisk === null || todayMaxRisk === null) {
    return {
      status: "location_error",
      errorCode: "risk_calculation_failed",
      detail: batchResult.detail,
    };
  }

  return {
    status: "ok",
    currentRiskLevel: toRiskLevel(currentRisk),
    todayMaxRiskLevel: toRiskLevel(todayMaxRisk),
  };
}
