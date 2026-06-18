import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/apiErrors";
import { httpClient } from "@/api/httpClient";

describe("httpClient", () => {
  const fetchMock = vi.fn<typeof fetch>();

  const getRequestHeaders = () => {
    const headers = fetchMock.mock.calls[0]?.[1]?.headers;

    expect(headers).toBeDefined();

    return new Headers(headers);
  };

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

  it("preserves headers provided as a Headers instance", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await httpClient("/home/risk", {
      headers: new Headers([["X-Trace-Id", "trace-1"]]),
    });

    const headers = getRequestHeaders();

    expect(headers.get("X-Trace-Id")).toBe("trace-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves headers provided as tuple arrays", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await httpClient("/home/risk", {
      headers: [["X-Session-Id", "session-1"]],
    });

    const headers = getRequestHeaders();

    expect(headers.get("X-Session-Id")).toBe("session-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not overwrite a caller-provided Content-Type header", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await httpClient("/home/risk", {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });

    expect(getRequestHeaders().get("Content-Type")).toBe(
      "application/merge-patch+json",
    );
  });
});
