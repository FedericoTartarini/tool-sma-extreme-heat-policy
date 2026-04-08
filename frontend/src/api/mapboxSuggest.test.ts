import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { suggestLocations } from "@/api/mapboxSuggest";

describe("suggestLocations", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("passes the requested types and maps feature metadata needed for ranking", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "place-darwin",
              feature_type: "place",
              name: "Darwin",
              place_formatted: "Northern Territory, Australia",
              context: {
                country: { country_code: "au" },
                region: { name: "Northern Territory" },
                place: { name: "Darwin" },
              },
            },
            {
              mapbox_id: "poi-wharf",
              feature_type: "poi",
              name: "Milsons Point Wharf",
              place_formatted: "Milsons Point, Sydney, 2060, Australia",
              context: {
                country: { country_code: "au" },
                region: { name: "New South Wales" },
                locality: { name: "Milsons Point" },
                place: { name: "Sydney" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Darwin",
      accessToken: "token",
      sessionToken: "session",
      types: "place,locality",
      language: "en",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "types=place%2Clocality",
    );
    expect(suggestions).toEqual([
      expect.objectContaining({
        mapboxId: "place-darwin",
        featureType: "place",
        primaryName: "Darwin",
        primaryNameNormalized: "darwin",
        placeNameNormalized: "darwin",
        localityNameNormalized: "",
        countryCode: "AU",
        region: "Northern Territory",
      }),
      expect.objectContaining({
        mapboxId: "poi-wharf",
        featureType: "poi",
        primaryName: "Milsons Point Wharf",
        primaryNameNormalized: "milsons point wharf",
        placeNameNormalized: "sydney",
        localityNameNormalized: "milsons point",
        countryCode: "AU",
        region: "New South Wales",
      }),
    ]);
  });

  it("throws when Mapbox suggest returns a non-OK response", async () => {
    fetchMock.mockResolvedValue(new Response("bad gateway", { status: 502 }));

    await expect(
      suggestLocations({
        query: "Darwin",
        accessToken: "token",
        sessionToken: "session",
        types: "place",
      }),
    ).rejects.toThrow("Mapbox suggest failed with HTTP 502");
  });
});
