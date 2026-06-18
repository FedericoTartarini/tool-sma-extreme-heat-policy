import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveLocationCoordinates } from "@/api/mapboxRetrieve";

describe("retrieveLocationCoordinates", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("extracts latitude and longitude from the first Mapbox feature", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              geometry: {
                coordinates: [151.067, -33.847],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      retrieveLocationCoordinates({
        mapboxId: "place-sydney",
        accessToken: "token",
        sessionToken: "session",
      }),
    ).resolves.toEqual({
      latitude: -33.847,
      longitude: 151.067,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://api.mapbox.com/search/searchbox/v1/retrieve/place-sydney?",
      ),
      expect.any(Object),
    );
  });

  it("throws a http_status error when retrieve returns a non-OK response", async () => {
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));

    await expect(
      retrieveLocationCoordinates({
        mapboxId: "missing",
        accessToken: "token",
        sessionToken: "session",
      }),
    ).rejects.toMatchObject({
      endpoint: "retrieve",
      kind: "http_status",
      status: 404,
    });
  });

  it("throws an invalid_response error when retrieve omits coordinates", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ features: [{ geometry: {} }] }), {
        status: 200,
      }),
    );

    await expect(
      retrieveLocationCoordinates({
        mapboxId: "place-sydney",
        accessToken: "token",
        sessionToken: "session",
      }),
    ).rejects.toMatchObject({
      endpoint: "retrieve",
      kind: "invalid_response",
    });
  });

  it("throws an invalid_response error when retrieve returns non-JSON content", async () => {
    fetchMock.mockResolvedValue(new Response("not-json", { status: 200 }));

    await expect(
      retrieveLocationCoordinates({
        mapboxId: "place-sydney",
        accessToken: "token",
        sessionToken: "session",
      }),
    ).rejects.toMatchObject({
      endpoint: "retrieve",
      kind: "invalid_response",
    });
  });

  it("throws an abort error when retrieve is cancelled", async () => {
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(
      retrieveLocationCoordinates({
        mapboxId: "place-sydney",
        accessToken: "token",
        sessionToken: "session",
      }),
    ).rejects.toMatchObject({
      endpoint: "retrieve",
      kind: "abort",
    });
  });
});
