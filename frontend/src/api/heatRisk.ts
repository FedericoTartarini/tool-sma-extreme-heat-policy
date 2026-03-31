import type { SportType } from "@/domain/sport";
import { endpoints } from "@/api/endpoints";
import { httpClient } from "@/api/httpClient";

export type HeatRiskProfile = "ADULT" | "KIDS";

export const DEFAULT_HEAT_RISK_PROFILE: HeatRiskProfile = "ADULT";

export interface HeatRiskRequest {
  sport: SportType;
  latitude: number;
  longitude: number;
  profile: HeatRiskProfile;
}

export interface HeatRiskApiData {
  risk_level_interpolated: number;
  t_medium: number;
  t_high: number;
  t_extreme: number;
  recommendation: string;
}

export interface ForecastInputsApiData {
  air_temperature_c: number;
  mean_radiant_temperature_c: number;
  relative_humidity_pct: number;
  wind_speed_10m_ms: number;
  wind_speed_effective_ms: number;
  direct_normal_irradiance_wm2: number;
}

export interface ForecastApiPoint {
  time_utc: string;
  inputs: ForecastInputsApiData;
  heat_risk: HeatRiskApiData;
}

export interface HeatRiskApiLocation {
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface HeatRiskApiRequestSummary {
  sport: string;
  profile: HeatRiskProfile;
  location: HeatRiskApiLocation;
}

export interface HeatRiskApiResponse {
  request: HeatRiskApiRequestSummary;
  forecast: ForecastApiPoint[];
}

export type HeatRiskErrorReason =
  | "missing_api_base_url"
  | "invalid_response"
  | "network_error";

export type HeatRiskApiResult =
  | {
      ok: true;
      data: HeatRiskApiResponse;
    }
  | {
      ok: false;
      reason: HeatRiskErrorReason;
    };

/**
 * Builds the Home heat-risk request payload using the current default profile.
 */
export function buildHeatRiskRequest(payload: {
  sport: SportType;
  latitude: number;
  longitude: number;
}): HeatRiskRequest {
  return {
    ...payload,
    profile: DEFAULT_HEAT_RISK_PROFILE,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidIsoDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isHeatRiskProfile(value: unknown): value is HeatRiskProfile {
  return value === "ADULT" || value === "KIDS";
}

function isHeatRiskApiData(value: unknown): value is HeatRiskApiData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.risk_level_interpolated) &&
    isFiniteNumber(value.t_medium) &&
    isFiniteNumber(value.t_high) &&
    isFiniteNumber(value.t_extreme) &&
    typeof value.recommendation === "string"
  );
}

function isForecastInputsApiData(
  value: unknown,
): value is ForecastInputsApiData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.air_temperature_c) &&
    isFiniteNumber(value.mean_radiant_temperature_c) &&
    isFiniteNumber(value.relative_humidity_pct) &&
    isFiniteNumber(value.wind_speed_10m_ms) &&
    isFiniteNumber(value.wind_speed_effective_ms) &&
    isFiniteNumber(value.direct_normal_irradiance_wm2)
  );
}

function isForecastApiPoint(value: unknown): value is ForecastApiPoint {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isValidIsoDateTime(value.time_utc) &&
    isForecastInputsApiData(value.inputs) &&
    isHeatRiskApiData(value.heat_risk)
  );
}

function isHeatRiskApiLocation(value: unknown): value is HeatRiskApiLocation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    typeof value.timezone === "string" &&
    value.timezone.length > 0
  );
}

function isHeatRiskApiRequestSummary(
  value: unknown,
): value is HeatRiskApiRequestSummary {
  return (
    isRecord(value) &&
    typeof value.sport === "string" &&
    value.sport.length > 0 &&
    isHeatRiskProfile(value.profile) &&
    isHeatRiskApiLocation(value.location)
  );
}

/**
 * Validates the backend heat-risk response payload shape at runtime.
 */
export function isHeatRiskApiResponse(
  value: unknown,
): value is HeatRiskApiResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isHeatRiskApiRequestSummary(value.request) &&
    Array.isArray(value.forecast) &&
    value.forecast.length > 0 &&
    value.forecast.every(isForecastApiPoint)
  );
}

/**
 * Fetches and validates the raw backend heat-risk response payload.
 */
export async function fetchHeatRisk(
  payload: HeatRiskRequest,
  options?: { signal?: AbortSignal },
): Promise<HeatRiskApiResult> {
  if (!import.meta.env.VITE_API_BASE_URL) {
    return {
      ok: false,
      reason: "missing_api_base_url",
    };
  }

  try {
    const response = await httpClient<unknown>(endpoints.heatRisk, {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
    const isValidResponse = isHeatRiskApiResponse(response);

    if (!isValidResponse) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      data: response,
    };
  } catch {
    return {
      ok: false,
      reason: "network_error",
    };
  }
}
