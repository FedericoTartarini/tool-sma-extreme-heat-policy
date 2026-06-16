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
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw toApiError(error, "Backend request failed");
  }

  if (!response.ok) {
    throw new ApiError({
      kind: "http_status",
      status: response.status,
      message: `Backend request failed with HTTP ${response.status}`,
    });
  }

  return (await parseJsonResponse(response)) as T;
}
