export type ApiErrorKind =
  | "missing_config"
  | "abort"
  | "http_status"
  | "invalid_response"
  | "network";

export interface ApiErrorParams {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  cause?: unknown;
}

/**
 * Structured error used by frontend API adapters for control flow.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor({ kind, message, status, cause }: ApiErrorParams) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.cause = cause;
  }
}

/**
 * Returns whether an unknown value is a structured frontend API error.
 */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/**
 * Returns whether an unknown value is a structured aborted API request.
 */
export function isAbortApiError(value: unknown): boolean {
  return isApiError(value) && value.kind === "abort";
}

/**
 * Detects native fetch abort errors without relying on DOMException instances.
 */
export function isAbortError(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    value.name === "AbortError"
  );
}

/**
 * Normalizes thrown fetch values into a structured API error.
 */
export function toApiError(error: unknown, message: string): ApiError {
  if (isApiError(error)) {
    return error;
  }

  return new ApiError({
    kind: isAbortError(error) ? "abort" : "network",
    message,
    cause: error,
  });
}
