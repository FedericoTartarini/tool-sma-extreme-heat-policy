import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocodeCoordinates } from "@/api/mapboxReverseGeocode";
import { suggestLocations } from "@/api/mapboxSuggest";
import { isSuggestionAlreadySaved } from "@/domain/savedLocation";
import { resolvePrefilledLocationSuggestion } from "@/domain/locationSearch";

describe("reverseGeocodeCoordinates", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("maps supported reverse-geocode results with the supplied coordinates", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                mapbox_id: "locality-redfern",
                feature_type: "locality",
                name: "Redfern",
                context: {
                  country: { name: "Australia", country_code: "AU" },
                  region: { name: "New South Wales" },
                  place: { name: "Sydney" },
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      reverseGeocodeCoordinates({
        latitude: -33.89334,
        longitude: 151.20461,
        accessToken: "token",
        language: "en",
      }),
    ).resolves.toEqual([
      {
        id: "locality-redfern",
        mapboxId: "locality-redfern",
        displayLabel: "Redfern, New South Wales, Australia",
        name: "Redfern",
        regionName: "New South Wales",
        countryName: "Australia",
        countryCode: "AU",
        latitude: -33.89334,
        longitude: 151.20461,
      },
    ]);

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toContain("latitude=-33.89334");
    expect(requestUrl).toContain("longitude=151.20461");
    expect(requestUrl).toContain("types=locality%2Cplace%2Ccity");
    expect(requestUrl).toContain("language=en");
  });

  it("uses locality context instead of an address-level result", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                mapbox_id: "address-regent-street",
                feature_type: "address",
                name: "98-100 Regent Street",
                context: {
                  country: { name: "Australia", country_code: "AU" },
                  region: { name: "New South Wales" },
                  locality: { id: "locality-redfern", name: "Redfern" },
                },
              },
            },
            {
              properties: {
                feature_type: "locality",
                name: "Redfern",
                context: {
                  country: { name: "Australia", country_code: "AU" },
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      reverseGeocodeCoordinates({
        latitude: -33.89334,
        longitude: 151.20461,
        accessToken: "token",
      }),
    ).resolves.toEqual([
      {
        id: "locality-redfern",
        mapboxId: "locality-redfern",
        displayLabel: "Redfern, New South Wales, Australia",
        name: "Redfern",
        regionName: "New South Wales",
        countryName: "Australia",
        countryCode: "AU",
        latitude: -33.89334,
        longitude: 151.20461,
      },
    ]);
  });

  it("returns no location for rural district, postcode and state context without a town", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                mapbox_id: "rural-property-abc",
                feature_type: "address",
                name: "Outback Sports Ground",
                context: {
                  country: { name: "Australia", country_code: "AU" },
                  region: { name: "Queensland" },
                  district: { name: "Western Downs" },
                  postcode: { id: "postcode-4405", name: "4405" },
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const suggestions = await reverseGeocodeCoordinates({
      latitude: -27.5,
      longitude: 150.5,
      accessToken: "token",
    });

    expect(suggestions).toEqual([]);
  });

  const coordinates = {
    latitude: -27.5,
    longitude: 150.5,
    accessToken: "token",
  };
  const country = { name: "Australia", country_code: "AU" };

  function reverseResponse(properties: Record<string, unknown>[]) {
    return new Response(
      JSON.stringify({
        features: properties.map((item) => ({ properties: item })),
      }),
      { status: 200 },
    );
  }

  it("uses the town's own identity when a rural address contains a town", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "rural-address",
          feature_type: "address",
          name: "Sports Ground",
          context: {
            country,
            region: { name: "Queensland" },
            postcode: { id: "postcode-4405", name: "4405" },
            place: { id: "place-dalby", name: "Dalby" },
          },
        },
      ]),
    );
    const [detected] = await reverseGeocodeCoordinates(coordinates);
    expect(detected).toMatchObject({
      id: "place-dalby",
      mapboxId: "place-dalby",
      displayLabel: "Dalby, Queensland, Australia",
    });

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "place-dalby",
              feature_type: "place",
              name: "Dalby",
              context: { country, region: { name: "Queensland" } },
            },
          ],
        }),
      ),
    );
    const searched = await suggestLocations({
      query: detected!.displayLabel,
      accessToken: "token",
      sessionToken: "session",
    });
    expect(
      resolvePrefilledLocationSuggestion({
        suggestions: searched,
        value: detected!.displayLabel,
        prefillSource: "url",
      })?.mapboxId,
    ).toBe(detected!.mapboxId);
  });

  it("recognises a saved detected suburb when the same suburb is searched", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "address-regent-street",
          feature_type: "address",
          name: "Regent Street",
          context: {
            country,
            region: { name: "New South Wales" },
            locality: { id: "locality-redfern", name: "Redfern" },
          },
        },
      ]),
    );
    const [detected] = await reverseGeocodeCoordinates(coordinates);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              mapbox_id: "locality-redfern",
              feature_type: "locality",
              name: "Redfern",
              context: { country, region: { name: "New South Wales" } },
            },
          ],
        }),
      ),
    );
    const [searched] = await suggestLocations({
      query: "Redfern",
      accessToken: "token",
      sessionToken: "session",
    });
    expect(detected!.mapboxId).toBe(searched!.mapboxId);
    expect(
      isSuggestionAlreadySaved(
        [
          {
            id: "saved-redfern",
            label: "Home",
            createdAt: 1,
            location: detected!,
          },
        ],
        searched!,
      ),
    ).toBe(true);
  });

  it("does not borrow an address ID when its suburb has no identity", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "address-regent-street",
          feature_type: "address",
          name: "Regent Street",
          context: { country, locality: { name: "Redfern" } },
        },
      ]),
    );
    await expect(reverseGeocodeCoordinates(coordinates)).resolves.toEqual([]);
  });

  it("prefers suburb context over a town-level feature and keeps its preferred name", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "place-sydney",
          feature_type: "place",
          name: "Sydney",
          context: {
            country,
            locality: {
              mapbox_id: "locality-redfern",
              name: "Old Redfern",
              name_preferred: "Redfern",
            },
          },
        },
      ]),
    );
    const [suggestion] = await reverseGeocodeCoordinates(coordinates);
    expect(suggestion).toMatchObject({
      mapboxId: "locality-redfern",
      name: "Redfern",
    });
  });

  it("orders suburbs before towns across features and removes duplicate suburb results", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "place-sydney",
          feature_type: "place",
          name: "Sydney",
          context: { country },
        },
        {
          mapbox_id: "locality-redfern",
          feature_type: "locality",
          name: "Redfern",
          context: { country },
        },
        {
          mapbox_id: "address-regent-street",
          feature_type: "address",
          name: "Regent Street",
          context: {
            country,
            locality: { id: "locality-redfern", name: "Redfern" },
          },
        },
      ]),
    );
    const suggestions = await reverseGeocodeCoordinates(coordinates);
    expect(suggestions.map(({ mapboxId }) => mapboxId)).toEqual([
      "locality-redfern",
      "place-sydney",
    ]);
  });

  it("uses a top-level preferred name", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "locality-redfern",
          feature_type: "locality",
          name: "Old Redfern",
          name_preferred: "Redfern",
          context: { country },
        },
      ]),
    );
    const [suggestion] = await reverseGeocodeCoordinates(coordinates);
    expect(suggestion?.name).toBe("Redfern");
  });

  it("rejects a suburb without country context", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "locality-redfern",
          feature_type: "locality",
          name: "Redfern",
          context: { place: { name: "Sydney" } },
        },
      ]),
    );
    await expect(reverseGeocodeCoordinates(coordinates)).resolves.toEqual([]);
  });

  it("matches search's country fallback for a city-state", async () => {
    fetchMock.mockResolvedValue(
      reverseResponse([
        {
          mapbox_id: "place-singapore",
          feature_type: "place",
          name: "Singapore",
        },
      ]),
    );
    const [suggestion] = await reverseGeocodeCoordinates(coordinates);
    expect(suggestion).toMatchObject({
      name: "Singapore",
      countryName: "Singapore",
      displayLabel: "Singapore, Singapore",
    });
  });

  it("wraps a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network unavailable"));
    await expect(reverseGeocodeCoordinates(coordinates)).rejects.toMatchObject({
      endpoint: "reverse",
      kind: "network",
    });
  });

  it("wraps invalid JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Unavailable</html>"));
    await expect(reverseGeocodeCoordinates(coordinates)).rejects.toMatchObject({
      endpoint: "reverse",
      kind: "invalid_response",
    });
  });

  it("throws a structured error for non-OK responses", async () => {
    fetchMock.mockResolvedValue(new Response("unauthorized", { status: 401 }));

    await expect(
      reverseGeocodeCoordinates({
        latitude: -33.89334,
        longitude: 151.20461,
        accessToken: "bad-token",
      }),
    ).rejects.toMatchObject({
      endpoint: "reverse",
      kind: "http_status",
      status: 401,
    });
  });

  it("throws an invalid-response error for malformed payloads", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ features: "bad" }), { status: 200 }),
    );

    await expect(
      reverseGeocodeCoordinates({
        latitude: -33.89334,
        longitude: 151.20461,
        accessToken: "token",
      }),
    ).rejects.toMatchObject({
      endpoint: "reverse",
      kind: "invalid_response",
    });
  });

  it("preserves abort errors", async () => {
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));

    await expect(
      reverseGeocodeCoordinates({
        latitude: -33.89334,
        longitude: 151.20461,
        accessToken: "token",
      }),
    ).rejects.toMatchObject({
      endpoint: "reverse",
      kind: "abort",
    });
  });
});
