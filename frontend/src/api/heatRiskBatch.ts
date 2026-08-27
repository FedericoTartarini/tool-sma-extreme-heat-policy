import type { SportType } from "@/domain/sport";
import { isApiError } from "@/api/apiErrors";
import { endpoints } from "@/api/endpoints";
import { httpClient, isApiBaseUrlConfigured } from "@/api/httpClient";
import {
  isHeatRiskProfile,
  type HeatRiskProfile,
} from "@/domain/heatRiskProfile";
import { parseOffsetIsoDateTime } from "@/lib/offsetIsoDateTime";

export interface BatchHeatRiskLocationRequest {
  latitude: number;
  longitude: number;
}

export interface BatchHeatRiskRequest {
  sport: SportType;
  profile: HeatRiskProfile;
  locations: BatchHeatRiskLocationRequest[];
}

export type BatchHeatRiskLocationStatus = "ok" | "error";

export interface BatchHeatRiskLocationResult {
  latitude: number;
  longitude: number;
  timezone: string | null;
  status: BatchHeatRiskLocationStatus;
  current_risk_level_interpolated: number | null;
  today_max_risk_level_interpolated: number | null;
  current_time_local: string | null;
  error_code: string | null;
  detail: string | null;
}

export interface BatchHeatRiskRequestSummary {
  sport: string;
  profile: HeatRiskProfile;
}

export interface BatchHeatRiskApiResponse {
  request: BatchHeatRiskRequestSummary;
  locations: BatchHeatRiskLocationResult[];
}

export type BatchHeatRiskErrorReason =
  | "missing_config"
  | "abort"
  | "http_status"
  | "invalid_response"
  | "network"
  | "weather_provider_unavailable";

export type BatchHeatRiskApiResult =
  | {
      ok: true;
      data: BatchHeatRiskApiResponse;
    }
  | {
      ok: false;
      reason: BatchHeatRiskErrorReason;
      status?: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBatchHeatRiskLocationStatus(
  value: unknown,
): value is BatchHeatRiskLocationStatus {
  return value === "ok" || value === "error";
}

function isValidOffsetIsoDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    parseOffsetIsoDateTime(value) !== null
  );
}

function isBatchHeatRiskLocationResult(
  value: unknown,
): value is BatchHeatRiskLocationResult {
  if (!isRecord(value)) {
    return false;
  }

  const currentRisk = value.current_risk_level_interpolated;
  const todayMaxRisk = value.today_max_risk_level_interpolated;
  const currentTimeLocal = value.current_time_local;

  return (
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    (value.timezone === null || typeof value.timezone === "string") &&
    isBatchHeatRiskLocationStatus(value.status) &&
    (currentRisk === null || isFiniteNumber(currentRisk)) &&
    (todayMaxRisk === null || isFiniteNumber(todayMaxRisk)) &&
    (currentTimeLocal === null || isValidOffsetIsoDateTime(currentTimeLocal)) &&
    (value.error_code === null || typeof value.error_code === "string") &&
    (value.detail === null || typeof value.detail === "string")
  );
}

function isBatchHeatRiskRequestSummary(
  value: unknown,
): value is BatchHeatRiskRequestSummary {
  return (
    isRecord(value) &&
    typeof value.sport === "string" &&
    value.sport.length > 0 &&
    isHeatRiskProfile(value.profile)
  );
}

/**
 * Validates the backend batch heat-risk response payload shape at runtime.
 */
export function isBatchHeatRiskApiResponse(
  value: unknown,
): value is BatchHeatRiskApiResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBatchHeatRiskRequestSummary(value.request) &&
    Array.isArray(value.locations) &&
    value.locations.every(isBatchHeatRiskLocationResult)
  );
}

function toBatchHeatRiskErrorReason(error: unknown): BatchHeatRiskErrorReason {
  if (isApiError(error)) {
    return error.serverCode === "weather_provider_unavailable"
      ? "weather_provider_unavailable"
      : error.kind;
  }

  return "network";
}

/**
 * Fetches and validates the raw backend batch heat-risk response payload.
 */
export async function fetchHeatRiskBatch(
  payload: BatchHeatRiskRequest,
  options?: { signal?: AbortSignal },
): Promise<BatchHeatRiskApiResult> {
  if (!isApiBaseUrlConfigured()) {
    return {
      ok: false,
      reason: "missing_config",
    };
  }

  try {
    const response = await httpClient<unknown>(endpoints.heatRiskBatch, {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options?.signal,
    });

    if (!isBatchHeatRiskApiResponse(response)) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      data: response,
    };
  } catch (error) {
    return {
      ok: false,
      reason: toBatchHeatRiskErrorReason(error),
      ...(isApiError(error) && error.status !== undefined
        ? { status: error.status }
        : {}),
    };
  }
}
