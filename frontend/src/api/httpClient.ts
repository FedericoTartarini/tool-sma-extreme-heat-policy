import { ApiError, toApiError } from "@/api/apiErrors";

/**
 * Returns the configured backend API base URL without a trailing slash.
 */
export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
}

/**
 * Returns whether backend API requests can be sent.
 */
export function isApiBaseUrlConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}

function buildUrl(path: string) {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with '/': ${path}`);
  }

  return `${getApiBaseUrl()}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseBackendErrorCode(
  response: Response,
): Promise<string | undefined> {
  try {
    const payload: unknown = await response.json();

    if (isRecord(payload) && typeof payload.error_code === "string") {
      return payload.error_code;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new ApiError({
      kind: "invalid_response",
      message: "Backend response was not valid JSON",
      cause: error,
    });
  }
}

function buildJsonHeaders(headers?: HeadersInit): Headers {
  const mergedHeaders = new Headers(headers);

  if (!mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  return mergedHeaders;
}

/**
 * Sends a JSON HTTP request to the configured backend base URL.
 */
export async function httpClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers: buildJsonHeaders(init?.headers),
    });
  } catch (error) {
    throw toApiError(error, "Backend request failed");
  }

  if (!response.ok) {
    const serverCode = await parseBackendErrorCode(response);

    throw new ApiError({
      kind: "http_status",
      status: response.status,
      serverCode,
      message: `Backend request failed with HTTP ${response.status}`,
    });
  }

  return (await parseJsonResponse(response)) as T;
}
