import { beforeEach, describe, expect, it, vi } from "vitest";
import { suggestLocations } from "@/api/mapboxSuggest";
import type { LocationSuggestion } from "@/domain/location";
import { createLocationSuggestRequestPlan } from "@/domain/locationSearch";
import { loadCombinedLocationSuggestions } from "@/hooks/useHomeLocationSuggest";

vi.mock("@/api/mapboxSuggest", () => ({
  suggestLocations: vi.fn(),
}));

function createSuggestion(
  overrides: Partial<LocationSuggestion> & {
    id: string;
    formattedLocation: string;
  },
): LocationSuggestion {
  return {
    id: overrides.id,
    label: overrides.label ?? overrides.formattedLocation,
    formattedLocation: overrides.formattedLocation,
    source: "mapbox",
    featureType: overrides.featureType ?? "place",
    primaryName:
      overrides.primaryName ?? overrides.formattedLocation.split(",")[0] ?? "",
    primaryNameNormalized: overrides.primaryNameNormalized ?? "",
    placeNameNormalized: overrides.placeNameNormalized ?? "",
    localityNameNormalized: overrides.localityNameNormalized ?? "",
    mapboxId: overrides.mapboxId ?? overrides.id,
    countryCode: overrides.countryCode ?? "AU",
    region: overrides.region,
    sessionToken: overrides.sessionToken ?? "session-test",
    latitude: overrides.latitude,
    longitude: overrides.longitude,
  };
}

describe("loadCombinedLocationSuggestions", () => {
  const suggestLocationsMock = vi.mocked(suggestLocations);
  const requestPlan = createLocationSuggestRequestPlan(
    "Charles Darwin University",
  );
  const primarySuggestions = [
    createSuggestion({
      id: "darwin-place",
      formattedLocation: "Darwin, Northern Territory, AU",
      primaryName: "Darwin",
      primaryNameNormalized: "darwin",
      placeNameNormalized: "darwin",
      region: "Northern Territory",
    }),
  ];

  beforeEach(() => {
    suggestLocationsMock.mockReset();
  });

  it("appends fallback suggestions when the expanded suggest succeeds", async () => {
    const fallbackSuggestions = [
      createSuggestion({
        id: "cdu-poi",
        formattedLocation: "Charles Darwin University, Casuarina, Darwin, AU",
        featureType: "poi",
        primaryName: "Charles Darwin University",
        primaryNameNormalized: "charles darwin university",
        placeNameNormalized: "darwin",
        localityNameNormalized: "casuarina",
      }),
    ];

    suggestLocationsMock
      .mockResolvedValueOnce(primarySuggestions)
      .mockResolvedValueOnce(fallbackSuggestions);

    await expect(
      loadCombinedLocationSuggestions({
        query: "Charles Darwin University",
        mapboxAccessToken: "token",
        sessionToken: "session",
        language: "en",
        requestPlan,
      }),
    ).resolves.toEqual([...primarySuggestions, ...fallbackSuggestions]);
    expect(suggestLocationsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: "Charles Darwin University",
        types: requestPlan.primaryTypes,
      }),
    );
    expect(suggestLocationsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: "Charles Darwin University",
        types: requestPlan.fallbackTypes,
      }),
    );
  });

  it("returns primary suggestions and logs when the expanded suggest fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    suggestLocationsMock
      .mockResolvedValueOnce(primarySuggestions)
      .mockRejectedValueOnce(new Error("Mapbox suggest failed with HTTP 429"));

    await expect(
      loadCombinedLocationSuggestions({
        query: "Charles Darwin University",
        mapboxAccessToken: "token",
        sessionToken: "session",
        language: "en",
        requestPlan,
      }),
    ).resolves.toEqual(primarySuggestions);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("rethrows abort errors from the expanded suggest request", async () => {
    const abortError = Object.assign(new Error("aborted"), {
      name: "AbortError",
    });

    suggestLocationsMock
      .mockResolvedValueOnce(primarySuggestions)
      .mockRejectedValueOnce(abortError);

    await expect(
      loadCombinedLocationSuggestions({
        query: "Charles Darwin University",
        mapboxAccessToken: "token",
        sessionToken: "session",
        language: "en",
        requestPlan,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
