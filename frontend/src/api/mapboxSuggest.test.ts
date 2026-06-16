import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { suggestLocations } from "@/api/mapboxSuggest";

const SUPPORTED_LOCATION_TYPES = "neighborhood,locality,place,city";

describe("suggestLocations", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("passes supported weather location types and maps readable display labels", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "locality-auburn",
              feature_type: "locality",
              name: "Auburn",
              context: {
                country: { name: "Australia", country_code: "au" },
                region: {
                  name: "New South Wales",
                  region_code: "NSW",
                  region_code_full: "AU-NSW",
                },
                place: { name: "Sydney" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Auburn",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
      language: "en",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "types=neighborhood%2Clocality%2Cplace%2Ccity",
    );
    expect(suggestions).toEqual([
      {
        id: "locality-auburn",
        displayLabel: "Auburn, New South Wales, Australia",
        name: "Auburn",
        regionName: "New South Wales",
        countryName: "Australia",
        mapboxId: "locality-auburn",
        countryCode: "AU",
        sessionToken: "session",
      },
    ]);
  });

  it("accepts neighborhood results", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "neighborhood-surry-hills",
              feature_type: "neighborhood",
              name: "Surry Hills",
              context: {
                country: { name: "Australia", country_code: "AU" },
                region: { name: "New South Wales" },
                place: { name: "Sydney" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Surry Hills",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions).toEqual([
      expect.objectContaining({
        id: "neighborhood-surry-hills",
        displayLabel: "Surry Hills, New South Wales, Australia",
      }),
    ]);
  });

  it("does not expose region or country codes in the display label", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "place-darwin",
              feature_type: "place",
              name: "Darwin",
              context: {
                country: { name: "Australia", country_code: "AU" },
                region: { name: "Northern Territory", region_code: "NT" },
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
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions[0]?.displayLabel).toBe(
      "Darwin, Northern Territory, Australia",
    );
    expect(suggestions[0]?.displayLabel).not.toContain("AU");
    expect(suggestions[0]?.displayLabel).not.toContain("NT");
  });

  it("falls back to name and country when region is missing", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "city-singapore",
              feature_type: "city",
              name: "Singapore",
              context: {
                country: { name: "Singapore", country_code: "SG" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Singapore",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions[0]?.displayLabel).toBe("Singapore, Singapore");
    expect(suggestions[0]).not.toHaveProperty("regionName");
  });

  it("uses place context as the country fallback for city-state results", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "place-hong-kong",
              feature_type: "place",
              name: "Hong Kong",
              context: {
                place: { name: "Hong Kong" },
              },
            },
            {
              mapbox_id: "locality-singapore",
              feature_type: "locality",
              name: "Singapore",
              context: {
                place: { name: "Singapore" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Hong Kong",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions).toEqual([
      {
        id: "place-hong-kong",
        displayLabel: "Hong Kong, Hong Kong",
        name: "Hong Kong",
        countryName: "Hong Kong",
        mapboxId: "place-hong-kong",
        sessionToken: "session",
      },
      {
        id: "locality-singapore",
        displayLabel: "Singapore, Singapore",
        name: "Singapore",
        countryName: "Singapore",
        mapboxId: "locality-singapore",
        sessionToken: "session",
      },
    ]);
    expect(suggestions[0]).not.toHaveProperty("countryCode");
    expect(suggestions[1]).not.toHaveProperty("countryCode");
  });

  it("does not use broader place context as the country fallback for local results", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "locality-fortitude-valley",
              feature_type: "locality",
              name: "Fortitude Valley",
              context: {
                place: { name: "Brisbane" },
              },
            },
            {
              mapbox_id: "neighborhood-south-bank",
              feature_type: "neighborhood",
              name: "South Bank",
              context: {
                place: { name: "Brisbane" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Brisbane",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions).toEqual([]);
  });

  it("uses the suggestion name as the country fallback for whole-place features", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "city-singapore",
              feature_type: "city",
              name: "Singapore",
              context: {},
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Singapore",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions).toEqual([
      expect.objectContaining({
        id: "city-singapore",
        displayLabel: "Singapore, Singapore",
        countryName: "Singapore",
      }),
    ]);
    expect(suggestions[0]).not.toHaveProperty("countryCode");
  });

  it("drops larger administrative results", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "district-greater-sydney",
              feature_type: "district",
              name: "Greater Sydney",
              context: {
                country: { name: "Australia", country_code: "AU" },
                region: { name: "New South Wales" },
              },
            },
            {
              mapbox_id: "region-new-south-wales",
              feature_type: "region",
              name: "New South Wales",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              mapbox_id: "country-hong-kong",
              feature_type: "country",
              name: "Hong Kong",
              context: {
                country: { name: "Hong Kong", country_code: "HK" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Hong Kong",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions).toEqual([]);
  });

  it("drops results outside supported weather location types or without readable identity", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "address-result",
              feature_type: "address",
              name: "10 George Street",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              mapbox_id: "street-result",
              feature_type: "street",
              name: "George Street",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              mapbox_id: "postcode-result",
              feature_type: "postcode",
              name: "2000",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              mapbox_id: "poi-wharf",
              feature_type: "poi",
              name: "Milsons Point Wharf",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              feature_type: "locality",
              name: "Auburn",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              mapbox_id: "locality-without-country-name",
              feature_type: "locality",
              name: "Auburn",
              context: {
                country: { country_code: "AU" },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await suggestLocations({
      query: "Auburn",
      accessToken: "token",
      sessionToken: "session",
      types: SUPPORTED_LOCATION_TYPES,
    });

    expect(suggestions).toEqual([]);
  });

  it("throws when Mapbox suggest returns a non-OK response", async () => {
    fetchMock.mockResolvedValue(new Response("bad gateway", { status: 502 }));

    try {
      await suggestLocations({
        query: "Darwin",
        accessToken: "token",
        sessionToken: "session",
        types: SUPPORTED_LOCATION_TYPES,
      });
      throw new Error("Expected Mapbox suggest to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "Mapbox suggest failed with HTTP 502",
      );
      expect(error).toMatchObject({
        endpoint: "suggest",
        kind: "http_status",
        status: 502,
      });
    }
  });

  it("throws an invalid_response error when Mapbox suggest returns a malformed payload", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ suggestions: "bad" }), { status: 200 }),
    );

    await expect(
      suggestLocations({
        query: "Darwin",
        accessToken: "token",
        sessionToken: "session",
        types: SUPPORTED_LOCATION_TYPES,
      }),
    ).rejects.toMatchObject({
      endpoint: "suggest",
      kind: "invalid_response",
    });
  });

  it("throws a network error when Mapbox suggest cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(
      suggestLocations({
        query: "Darwin",
        accessToken: "token",
        sessionToken: "session",
        types: SUPPORTED_LOCATION_TYPES,
      }),
    ).rejects.toMatchObject({
      endpoint: "suggest",
      kind: "network",
    });
  });

  it("throws an abort error when Mapbox suggest is cancelled", async () => {
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(
      suggestLocations({
        query: "Darwin",
        accessToken: "token",
        sessionToken: "session",
        types: SUPPORTED_LOCATION_TYPES,
      }),
    ).rejects.toMatchObject({
      endpoint: "suggest",
      kind: "abort",
    });
  });
});
