import { describe, expect, it } from "vitest";
import type { LocationSuggestion } from "@/domain/location";
import {
  createLocationSuggestRequestPlan,
  isAddressLikeLocationQuery,
  normalizeLocationSearchText,
  prepareLocationSuggestions,
  resolvePrefilledLocationSuggestion,
  shouldFallbackToExpandedSuggest,
} from "@/domain/locationSearch";

function createSuggestion(
  overrides: Partial<LocationSuggestion> & {
    id: string;
    formattedLocation: string;
    featureType?: LocationSuggestion["featureType"];
    primaryName?: string;
  },
): LocationSuggestion {
  const primaryName =
    overrides.primaryName ?? overrides.formattedLocation.split(",")[0] ?? "";

  return {
    id: overrides.id,
    label: overrides.label ?? overrides.formattedLocation,
    formattedLocation: overrides.formattedLocation,
    source: "mapbox",
    featureType: overrides.featureType ?? "place",
    primaryName,
    primaryNameNormalized:
      overrides.primaryNameNormalized ??
      normalizeLocationSearchText(primaryName),
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

describe("createLocationSuggestRequestPlan", () => {
  it("uses place-first types for generic location queries", () => {
    expect(createLocationSuggestRequestPlan("Milsons Point")).toEqual({
      queryNormalized: "milsons point",
      isAddressLike: false,
      primaryTypes: "place,city,locality,neighborhood,postcode,region,district",
      fallbackTypes:
        "place,city,locality,neighborhood,postcode,region,district,address,street,poi",
    });
  });

  it("uses address-inclusive types for address-like queries", () => {
    expect(createLocationSuggestRequestPlan("10 Downing St")).toEqual({
      queryNormalized: "10 downing st",
      isAddressLike: true,
      primaryTypes:
        "place,city,locality,neighborhood,postcode,region,district,address,street",
      fallbackTypes: null,
    });
  });
});

describe("isAddressLikeLocationQuery", () => {
  it("detects leading street numbers and street suffixes", () => {
    expect(isAddressLikeLocationQuery("10 Downing St")).toBe(true);
    expect(isAddressLikeLocationQuery("221B Baker Street")).toBe(true);
  });

  it("does not treat generic place names as addresses", () => {
    expect(isAddressLikeLocationQuery("Milsons Point")).toBe(false);
    expect(isAddressLikeLocationQuery("Charles Darwin University")).toBe(false);
  });
});

describe("shouldFallbackToExpandedSuggest", () => {
  it("keeps venue-like queries eligible for fallback when only weak place matches exist", () => {
    expect(
      shouldFallbackToExpandedSuggest({
        queryNormalized: normalizeLocationSearchText(
          "Charles Darwin University",
        ),
        isAddressLike: false,
        suggestions: [
          createSuggestion({
            id: "darwin-place",
            formattedLocation: "Darwin, AU",
            featureType: "place",
            primaryName: "Darwin",
          }),
        ],
      }),
    ).toBe(true);
  });

  it("skips fallback when a strong place match is already available", () => {
    expect(
      shouldFallbackToExpandedSuggest({
        queryNormalized: normalizeLocationSearchText("Darwin"),
        isAddressLike: false,
        suggestions: [
          createSuggestion({
            id: "darwin-place",
            formattedLocation: "Darwin, AU",
            featureType: "place",
            primaryName: "Darwin",
          }),
        ],
      }),
    ).toBe(false);
  });
});

describe("prepareLocationSuggestions", () => {
  it("ranks exact place matches ahead of Darwin-named addresses and POIs", () => {
    const prepared = prepareLocationSuggestions({
      query: "Darwin",
      suggestions: [
        createSuggestion({
          id: "poi",
          formattedLocation: "Charles Darwin University, Sydney, AU",
          featureType: "poi",
          primaryName: "Charles Darwin University",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "street",
          formattedLocation: "Darwin Street, Sydney, AU",
          featureType: "street",
          primaryName: "Darwin Street",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "place",
          formattedLocation: "Darwin, AU",
          featureType: "place",
          primaryName: "Darwin",
        }),
      ],
    });

    expect(prepared.visibleSuggestions[0]?.formattedLocation).toBe(
      "Darwin, AU",
    );
  });

  it("reduces Broome street clutter to the exact place result", () => {
    const prepared = prepareLocationSuggestions({
      query: "Broome",
      suggestions: [
        createSuggestion({
          id: "place",
          formattedLocation: "Broome, AU",
          featureType: "place",
          primaryName: "Broome",
        }),
        createSuggestion({
          id: "street-1",
          formattedLocation: "10 Broome St, Sydney, AU",
          featureType: "address",
          primaryName: "10 Broome St",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "street-2",
          formattedLocation: "20 Broome Ave, Sydney, AU",
          featureType: "address",
          primaryName: "20 Broome Ave",
          placeNameNormalized: "sydney",
        }),
      ],
    });

    expect(prepared.visibleSuggestions).toHaveLength(1);
    expect(prepared.visibleSuggestions[0]?.formattedLocation).toBe(
      "Broome, AU",
    );
  });

  it("collapses Milsons Point variants to a single visible result", () => {
    const prepared = prepareLocationSuggestions({
      query: "Milsons Point",
      suggestions: [
        createSuggestion({
          id: "place",
          formattedLocation: "Milsons Point, Sydney, AU",
          featureType: "place",
          primaryName: "Milsons Point",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "postcode-variant",
          formattedLocation: "Milsons Point, Sydney, 2061, AU",
          featureType: "place",
          primaryName: "Milsons Point",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "wharf",
          formattedLocation: "Milsons Point Wharf, Milsons Point, Sydney, AU",
          featureType: "poi",
          primaryName: "Milsons Point Wharf",
          placeNameNormalized: "sydney",
          localityNameNormalized: "milsons point",
        }),
      ],
    });

    expect(prepared.visibleSuggestions).toEqual([
      expect.objectContaining({
        formattedLocation: "Milsons Point, Sydney, AU",
      }),
    ]);
  });

  it("keeps address suggestions available for address-like queries", () => {
    const prepared = prepareLocationSuggestions({
      query: "123 Broome St",
      suggestions: [
        createSuggestion({
          id: "address-1",
          formattedLocation: "123 Broome St, Sydney, AU",
          featureType: "address",
          primaryName: "123 Broome St",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "address-2",
          formattedLocation: "125 Broome St, Sydney, AU",
          featureType: "address",
          primaryName: "125 Broome St",
          placeNameNormalized: "sydney",
        }),
      ],
    });

    expect(
      prepared.visibleSuggestions.some(
        (suggestion) => suggestion.featureType === "address",
      ),
    ).toBe(true);
  });

  it("caps the visible list at three suggestions", () => {
    const prepared = prepareLocationSuggestions({
      query: "Sydney",
      suggestions: [
        createSuggestion({
          id: "sydney-place",
          formattedLocation: "Sydney, AU",
          featureType: "place",
          primaryName: "Sydney",
        }),
        createSuggestion({
          id: "north-sydney",
          formattedLocation: "North Sydney, AU",
          featureType: "place",
          primaryName: "North Sydney",
        }),
        createSuggestion({
          id: "sydney-cbd",
          formattedLocation: "Sydney CBD, Sydney, AU",
          featureType: "neighborhood",
          primaryName: "Sydney CBD",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "sydney-olympic-park",
          formattedLocation: "Sydney Olympic Park, Sydney, AU",
          featureType: "neighborhood",
          primaryName: "Sydney Olympic Park",
          placeNameNormalized: "sydney",
        }),
      ],
    });

    expect(prepared.visibleSuggestions).toHaveLength(3);
  });

  it("preserves exact prefilled matches in the ranked list after visible collapse", () => {
    const prepared = prepareLocationSuggestions({
      query: "Milsons Point",
      suggestions: [
        createSuggestion({
          id: "canonical",
          formattedLocation: "Milsons Point, Sydney, AU",
          featureType: "place",
          primaryName: "Milsons Point",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "exact-prefill",
          formattedLocation: "Milsons Point, Sydney, 2061, AU",
          featureType: "place",
          primaryName: "Milsons Point",
          placeNameNormalized: "sydney",
        }),
        createSuggestion({
          id: "wharf",
          formattedLocation: "Milsons Point Wharf, Milsons Point, Sydney, AU",
          featureType: "poi",
          primaryName: "Milsons Point Wharf",
          placeNameNormalized: "sydney",
          localityNameNormalized: "milsons point",
        }),
      ],
    });

    expect(
      resolvePrefilledLocationSuggestion({
        suggestions: prepared.rankedSuggestions,
        value: "Milsons Point, Sydney, 2061, AU",
        prefillSource: "url",
      }),
    ).toEqual(
      expect.objectContaining({
        formattedLocation: "Milsons Point, Sydney, 2061, AU",
      }),
    );
    expect(prepared.visibleSuggestions).toHaveLength(1);
  });
});
