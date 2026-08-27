import { describe, expect, it } from "vitest";
import {
  canAddSavedLocation,
  createSavedLocationFromSuggestion,
  formatSavedLocationSubtitle,
  buildMulticityHomePath,
  toSavedLocationAvatarLabel,
  isDuplicateSavedLocation,
  MAX_SAVED_LOCATIONS,
  validateAddSavedLocation,
  type SavedLocation,
} from "@/domain/multicity";
import { SportType } from "@/domain/sport";
import type { LocationSuggestion } from "@/domain/location";

const BASE_SUGGESTION: LocationSuggestion = {
  id: "suggestion-1",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  mapboxId: "mapbox-sydney",
  latitude: -33.847,
  longitude: 151.067,
};

function createSavedLocation(
  overrides: Partial<SavedLocation> = {},
): SavedLocation {
  return {
    id: "location-1",
    displayLabel: "Sydney, New South Wales, Australia",
    name: "Sydney",
    regionName: "New South Wales",
    countryName: "Australia",
    latitude: -33.847,
    longitude: 151.067,
    mapboxId: "mapbox-sydney",
    ...overrides,
  };
}

describe("multicity domain", () => {
  it("creates a saved location from a resolved suggestion", () => {
    const savedLocation = createSavedLocationFromSuggestion({
      ...BASE_SUGGESTION,
      latitude: -33.847,
      longitude: 151.067,
    });

    expect(savedLocation).toMatchObject({
      displayLabel: BASE_SUGGESTION.displayLabel,
      name: "Sydney",
      latitude: -33.847,
      longitude: 151.067,
      mapboxId: "mapbox-sydney",
    });
    expect(savedLocation.id.length).toBeGreaterThan(0);
  });

  it("detects duplicate locations by mapbox id or coordinates", () => {
    const locations = [createSavedLocation()];

    expect(
      isDuplicateSavedLocation(locations, {
        latitude: -33.847,
        longitude: 151.067,
        mapboxId: "mapbox-sydney",
      }),
    ).toBe(true);

    expect(
      isDuplicateSavedLocation(locations, {
        latitude: -37.813,
        longitude: 144.963,
        mapboxId: "mapbox-melbourne",
      }),
    ).toBe(false);
  });

  it("treats matching coordinates as duplicates when mapbox ids differ", () => {
    const locations = [createSavedLocation({ mapboxId: "session-a-sydney" })];

    expect(
      isDuplicateSavedLocation(locations, {
        latitude: -33.847,
        longitude: 151.067,
        mapboxId: "session-b-sydney",
      }),
    ).toBe(true);
  });

  it("treats matching mapbox ids as duplicates even when coordinates differ", () => {
    const locations = [createSavedLocation()];

    expect(
      isDuplicateSavedLocation(locations, {
        latitude: -33.9,
        longitude: 151.2,
        mapboxId: "mapbox-sydney",
      }),
    ).toBe(true);
  });

  it("enforces the max saved location limit", () => {
    const locations = Array.from({ length: MAX_SAVED_LOCATIONS }, (_, index) =>
      createSavedLocation({
        id: `location-${index}`,
        displayLabel: `City ${index}`,
        name: `City ${index}`,
        latitude: -33 + index * 0.01,
        longitude: 151 + index * 0.01,
        mapboxId: `mapbox-${index}`,
      }),
    );

    expect(canAddSavedLocation(locations)).toBe(false);
    expect(validateAddSavedLocation(locations, BASE_SUGGESTION)).toEqual({
      ok: false,
      reason: "max_reached",
    });
  });

  it("rejects suggestions without coordinates", () => {
    expect(
      validateAddSavedLocation([], {
        ...BASE_SUGGESTION,
        latitude: undefined,
        longitude: undefined,
      }),
    ).toEqual({
      ok: false,
      reason: "missing_coordinates",
    });
  });

  it("formats saved location subtitles from region and country", () => {
    expect(
      formatSavedLocationSubtitle({
        name: "Richmond",
        regionName: "Victoria",
        countryName: "Australia",
      }),
    ).toBe("Victoria, Australia");

    expect(
      formatSavedLocationSubtitle({
        name: "Richmond",
        regionName: "New South Wales",
        countryName: "Australia",
      }),
    ).toBe("New South Wales, Australia");

    expect(
      formatSavedLocationSubtitle({
        name: "Singapore",
        countryName: "Singapore",
      }),
    ).toBe("Singapore");
  });

  it("builds home navigation URLs with multicity sport and location label", () => {
    expect(
      buildMulticityHomePath(
        SportType.Soccer,
        "Sydney, New South Wales, Australia",
      ),
    ).toBe("/?sport=SOCCER&loc=Sydney%2C+New+South+Wales%2C+Australia");
  });

  it("builds mobile avatar labels from city names", () => {
    expect(toSavedLocationAvatarLabel("Sydney")).toBe("S");
    expect(toSavedLocationAvatarLabel("  ")).toBe("?");
  });
});
