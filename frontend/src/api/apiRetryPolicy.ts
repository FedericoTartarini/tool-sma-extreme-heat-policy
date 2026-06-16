import { ApiError, isApiError } from "@/api/apiErrors";
import { MapboxApiError } from "@/api/mapboxErrors";

const MAPBOX_RETRIEVE_RETRY_DELAY_MS = 400;
const HEAT_RISK_RETRY_DELAY_MS = 500;
const SINGLE_RETRY = 1;

export interface RetryDelayParams {
  scope: "mapbox_retrieve" | "heat_risk";
}

export type RetryContinuationGuard = () => boolean;

export interface ApiRetryPolicy {
  maxRetries: number;
  delayMs: number;
  shouldRetry: (error: unknown) => boolean;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function isHttpStatus(error: unknown, statuses: readonly number[]): boolean {
  return (
    isApiError(error) &&
    error.kind === "http_status" &&
    error.status !== undefined &&
    statuses.includes(error.status)
  );
}

function isHttpStatusAtLeast(error: unknown, lowerBound: number): boolean {
  return (
    isApiError(error) &&
    error.kind === "http_status" &&
    error.status !== undefined &&
    error.status >= lowerBound
  );
}

/**
 * Returns the short fixed retry delay for a bounded frontend API retry.
 */
export function getRetryDelayMs({ scope }: RetryDelayParams): number {
  return scope === "mapbox_retrieve"
    ? MAPBOX_RETRIEVE_RETRY_DELAY_MS
    : HEAT_RISK_RETRY_DELAY_MS;
}

/**
 * Returns whether a Mapbox retrieve error is likely transient.
 */
export function shouldRetryMapboxRetrieveError(error: unknown): boolean {
  return (
    error instanceof MapboxApiError &&
    error.endpoint === "retrieve" &&
    (error.kind === "network" ||
      isHttpStatus(error, [429]) ||
      isHttpStatusAtLeast(error, 500))
  );
}

/**
 * Returns whether a backend heat-risk error is likely transient.
 */
export function shouldRetryHeatRiskError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === "network" || isHttpStatus(error, [502, 503, 504]))
  );
}

/**
 * Runs an API operation with a bounded retry policy and optional freshness guard.
 */
export async function retryApiRequest<T>(
  operation: () => Promise<T>,
  policy: ApiRetryPolicy,
  options?: { canContinue?: RetryContinuationGuard },
): Promise<T> {
  let retryCount = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const canContinue = options?.canContinue?.() ?? true;
      if (
        !canContinue ||
        retryCount >= policy.maxRetries ||
        !policy.shouldRetry(error)
      ) {
        throw error;
      }

      retryCount += 1;
      await sleep(policy.delayMs);

      if (options?.canContinue && !options.canContinue()) {
        throw error;
      }
    }
  }
}

export const mapboxRetrieveRetryPolicy: ApiRetryPolicy = {
  maxRetries: SINGLE_RETRY,
  delayMs: getRetryDelayMs({ scope: "mapbox_retrieve" }),
  shouldRetry: shouldRetryMapboxRetrieveError,
};

export const heatRiskRetryPolicy: ApiRetryPolicy = {
  maxRetries: SINGLE_RETRY,
  delayMs: getRetryDelayMs({ scope: "heat_risk" }),
  shouldRetry: shouldRetryHeatRiskError,
};
