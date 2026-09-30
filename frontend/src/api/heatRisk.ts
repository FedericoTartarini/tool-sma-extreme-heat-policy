import type { SportType } from "@/domain/sport";
import { isApiError } from "@/api/apiErrors";
import { endpoints } from "@/api/endpoints";
import { httpClient, isApiBaseUrlConfigured } from "@/api/httpClient";
import {
  isHeatRiskProfile,
  type HeatRiskProfile,
} from "@/domain/heatRiskProfile";
import { parseOffsetIsoDateTime } from "@/lib/offsetIsoDateTime";

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
  tdb: number;
  tr: number;
  rh: number;
  v_z1: number;
  sol_radiation_dir: number;
}

export interface ForecastApiPoint {
  time_utc: string;
  time_local: string;
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

export interface DailyWeatherApiSummary {
  date: string;
  sunrise_local?: string | null;
  sunset_local?: string | null;
  uv_index_max?: number | null;
  precip_prob_max_pct?: number | null;
  cumulative_rainfall_mm?: number | null;
  max_temp_c?: number | null;
  min_temp_c?: number | null;
  max_temp_time_local?: string | null;
  min_temp_time_local?: string | null;
  humidity_at_max_pct?: number | null;
  humidity_at_min_pct?: number | null;
  uv_index_max_time_local?: string | null;
  avg_wind_speed_ms?: number | null;
}

export interface HeatRiskApiResponse {
  request: HeatRiskApiRequestSummary;
  forecast: ForecastApiPoint[];
  daily_weather: DailyWeatherApiSummary[];
}

export interface HeatRiskApiCore {
  request: HeatRiskApiRequestSummary;
  forecast: ForecastApiPoint[];
}

export type HeatRiskErrorReason =
  | "missing_config"
  | "abort"
  | "http_status"
  | "invalid_response"
  | "network"
  | "weather_provider_unavailable";

export type HeatRiskApiResult =
  | {
      ok: true;
      data: HeatRiskApiResponse;
    }
  | {
      ok: false;
      reason: HeatRiskErrorReason;
      status?: number;
    };

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

function isValidOffsetIsoDateTime(value: unknown): value is string {
  return parseOffsetIsoDateTime(value) !== null;
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
    isFiniteNumber(value.tdb) &&
    isFiniteNumber(value.tr) &&
    isFiniteNumber(value.rh) &&
    isFiniteNumber(value.v_z1) &&
    isFiniteNumber(value.sol_radiation_dir)
  );
}

function isForecastApiPoint(value: unknown): value is ForecastApiPoint {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isValidIsoDateTime(value.time_utc) &&
    isValidOffsetIsoDateTime(value.time_local) &&
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

const LOCAL_CALENDAR_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isLocalCalendarDateKey(value: unknown): value is string {
  return (
    typeof value === "string" && LOCAL_CALENDAR_DATE_KEY_PATTERN.test(value)
  );
}

function isOptionalFiniteNumber(
  value: unknown,
): value is number | null | undefined {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isDailyWeatherApiSummary(
  value: unknown,
): value is DailyWeatherApiSummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isLocalCalendarDateKey(value.date) &&
    isOptionalLocalTimeLabel(value.sunrise_local) &&
    isOptionalLocalTimeLabel(value.sunset_local) &&
    isOptionalFiniteNumber(value.uv_index_max) &&
    isOptionalFiniteNumber(value.precip_prob_max_pct) &&
    isOptionalFiniteNumber(value.cumulative_rainfall_mm) &&
    isOptionalFiniteNumber(value.max_temp_c) &&
    isOptionalFiniteNumber(value.min_temp_c) &&
    isOptionalFiniteNumber(value.humidity_at_max_pct) &&
    isOptionalFiniteNumber(value.humidity_at_min_pct) &&
    isOptionalFiniteNumber(value.avg_wind_speed_ms) &&
    isOptionalLocalTimeLabel(value.max_temp_time_local) &&
    isOptionalLocalTimeLabel(value.min_temp_time_local) &&
    isOptionalLocalTimeLabel(value.uv_index_max_time_local)
  );
}

function isOptionalLocalTimeLabel(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && /^\d{2}:\d{2}$/.test(value))
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
 * Keeps only well-formed daily weather rows so extra weather can be dropped
 * without rejecting the rest of the heat-risk payload.
 */
function listDailyWeatherApiSummaries(
  value: unknown,
): DailyWeatherApiSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isDailyWeatherApiSummary);
}

function isHeatRiskApiCore(
  value: unknown,
): value is HeatRiskApiCore & Record<string, unknown> {
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
 * Validates the backend heat-risk response payload shape at runtime.
 * Daily weather is not checked here; `fetchHeatRisk` filters it separately.
 */
export function isHeatRiskApiResponse(
  value: unknown,
): value is HeatRiskApiCore {
  return isHeatRiskApiCore(value);
}

function parseHeatRiskApiResponse(value: unknown): HeatRiskApiResponse | null {
  if (!isHeatRiskApiCore(value)) {
    return null;
  }

  return {
    request: value.request,
    forecast: value.forecast,
    daily_weather: listDailyWeatherApiSummaries(value.daily_weather),
  };
}

function toHeatRiskErrorReason(error: unknown): HeatRiskErrorReason {
  if (isApiError(error)) {
    return error.serverCode === "weather_provider_unavailable"
      ? "weather_provider_unavailable"
      : error.kind;
  }

  return "network";
}

/**
 * Fetches and validates the raw backend heat-risk response payload.
 */
export async function fetchHeatRisk(
  payload: HeatRiskRequest,
  options?: { signal?: AbortSignal },
): Promise<HeatRiskApiResult> {
  if (!isApiBaseUrlConfigured()) {
    return {
      ok: false,
      reason: "missing_config",
    };
  }

  try {
    const response = await httpClient<unknown>(endpoints.heatRisk, {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
    const parsedResponse = parseHeatRiskApiResponse(response);

    if (!parsedResponse) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      data: parsedResponse,
    };
  } catch (error) {
    return {
      ok: false,
      reason: toHeatRiskErrorReason(error),
      ...(isApiError(error) && error.status !== undefined
        ? { status: error.status }
        : {}),
    };
  }
}
