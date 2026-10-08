import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocodeCoordinates } from "@/api/mapboxReverseGeocode";

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
    expect(requestUrl).toContain(
      "types=neighborhood%2Clocality%2Cplace%2Ccity",
    );
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
                  locality: { name: "Redfern" },
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
        id: "address-regent-street",
        mapboxId: "address-regent-street",
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

  it("falls back to district context when no supported tier is present", async () => {
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
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const [suggestion] = await reverseGeocodeCoordinates({
      latitude: -27.5,
      longitude: 150.5,
      accessToken: "token",
    });

    expect(suggestion).toEqual(
      expect.objectContaining({
        name: "Western Downs",
        displayLabel: "Western Downs, Queensland, Australia",
        id: "rural-property-abc",
        mapboxId: "rural-property-abc",
      }),
    );
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
