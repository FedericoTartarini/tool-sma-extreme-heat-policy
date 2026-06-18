import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/apiErrors";
import { httpClient } from "@/api/httpClient";

describe("httpClient", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("preserves backend error codes on non-OK JSON responses", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: "Weather provider unavailable",
          error_code: "weather_provider_unavailable",
        }),
        { status: 502 },
      ),
    );

    await expect(httpClient("/home/risk")).rejects.toMatchObject({
      name: "ApiError",
      kind: "http_status",
      status: 502,
      serverCode: "weather_provider_unavailable",
    } satisfies Partial<ApiError>);
  });
});
