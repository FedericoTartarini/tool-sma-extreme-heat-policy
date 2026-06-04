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
      types: "locality,neighborhood,place,city",
      language: "en",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "types=locality%2Cneighborhood%2Cplace%2Ccity",
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
      types: "locality,neighborhood,place,city",
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
      types: "locality,neighborhood,place,city",
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
      types: "locality,neighborhood,place,city",
    });

    expect(suggestions[0]?.displayLabel).toBe("Singapore, Singapore");
    expect(suggestions[0]).not.toHaveProperty("regionName");
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
              mapbox_id: "district-result",
              feature_type: "district",
              name: "Greater Sydney",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              mapbox_id: "region-result",
              feature_type: "region",
              name: "New South Wales",
              context: {
                country: { name: "Australia", country_code: "AU" },
              },
            },
            {
              mapbox_id: "country-result",
              feature_type: "country",
              name: "Australia",
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
      types: "locality,neighborhood,place,city",
    });

    expect(suggestions).toEqual([]);
  });

  it("throws when Mapbox suggest returns a non-OK response", async () => {
    fetchMock.mockResolvedValue(new Response("bad gateway", { status: 502 }));

    await expect(
      suggestLocations({
        query: "Darwin",
        accessToken: "token",
        sessionToken: "session",
        types: "locality,neighborhood,place,city",
      }),
    ).rejects.toThrow("Mapbox suggest failed with HTTP 502");
  });
});
