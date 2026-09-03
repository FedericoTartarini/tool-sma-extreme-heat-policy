import { describe, expect, it } from "vitest";
import type { LocationSuggestion } from "@/domain/location";
import {
  createSavedLocation,
  hasCoordinates,
  isDuplicateLabel,
  isSamePlace,
  isSuggestionAlreadySaved,
  normalizeLabel,
  stripSessionToken,
  SAVED_LOCATION_LABEL_MAX_LENGTH,
  type SavedLocation,
} from "@/domain/savedLocation";

const PERTH: LocationSuggestion = {
  id: "loc-perth",
  displayLabel: "Perth, Western Australia, Australia",
  name: "Perth",
  regionName: "Western Australia",
  countryName: "Australia",
  mapboxId: "mapbox-perth",
  sessionToken: "session-perth",
  latitude: -31.9523,
  longitude: 115.8613,
};

function toSavedLocation(label: string): SavedLocation {
  return { id: `saved-${label}`, label, location: PERTH, createdAt: 0 };
}

describe("normalizeLabel", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeLabel("  Home  ")).toBe("Home");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeLabel("   ")).toBe("");
  });

  it("caps the label at the maximum length", () => {
    expect(normalizeLabel("a".repeat(30))).toHaveLength(
      SAVED_LOCATION_LABEL_MAX_LENGTH,
    );
  });
});

describe("isDuplicateLabel", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(isDuplicateLabel([toSavedLocation("Home")], "  home  ")).toBe(true);
  });

  it("accepts a label that is not saved yet", () => {
    expect(isDuplicateLabel([toSavedLocation("Home")], "Gym")).toBe(false);
  });

  it("accepts any label when nothing is saved", () => {
    expect(isDuplicateLabel([], "Home")).toBe(false);
  });
});

describe("hasCoordinates", () => {
  it("accepts a location with both coordinates", () => {
    expect(hasCoordinates(PERTH)).toBe(true);
  });

  it("rejects a location that was never retrieved", () => {
    expect(
      hasCoordinates({ ...PERTH, latitude: undefined, longitude: undefined }),
    ).toBe(false);
  });

  it("rejects a partially resolved location", () => {
    expect(hasCoordinates({ ...PERTH, longitude: undefined })).toBe(false);
  });

  it("rejects unparsable coordinates", () => {
    expect(hasCoordinates({ ...PERTH, latitude: Number.NaN })).toBe(false);
  });
});

describe("stripSessionToken", () => {
  it("drops the expiring Mapbox session token", () => {
    expect(stripSessionToken(PERTH).sessionToken).toBeUndefined();
  });

  it("keeps every other field", () => {
    expect(stripSessionToken(PERTH)).toMatchObject({
      displayLabel: PERTH.displayLabel,
      latitude: PERTH.latitude,
      longitude: PERTH.longitude,
    });
  });

  it("does not mutate the input", () => {
    stripSessionToken(PERTH);

    expect(PERTH.sessionToken).toBe("session-perth");
  });
});

describe("isSamePlace", () => {
  it("matches on Mapbox id when both sides have one", () => {
    expect(
      isSamePlace(PERTH, {
        ...PERTH,
        id: "other-id",
        displayLabel: "Somewhere else",
      }),
    ).toBe(true);
  });

  it("matches on suggestion id when Mapbox ids are missing", () => {
    expect(
      isSamePlace(
        { ...PERTH, mapboxId: undefined },
        { ...PERTH, mapboxId: undefined, displayLabel: "Somewhere else" },
      ),
    ).toBe(true);
  });

  it("matches on display label when ids differ", () => {
    expect(
      isSamePlace(
        { ...PERTH, id: "a", mapboxId: undefined },
        { ...PERTH, id: "b", mapboxId: undefined },
      ),
    ).toBe(true);
  });
});

describe("isSuggestionAlreadySaved", () => {
  it("finds a saved snapshot of the same Mapbox place", () => {
    expect(isSuggestionAlreadySaved([toSavedLocation("Home")], PERTH)).toBe(
      true,
    );
  });

  it("rejects a different suggestion", () => {
    expect(
      isSuggestionAlreadySaved([toSavedLocation("Home")], {
        ...PERTH,
        id: "loc-sydney",
        mapboxId: "mapbox-sydney",
        displayLabel: "Sydney, New South Wales, Australia",
      }),
    ).toBe(false);
  });
});

describe("createSavedLocation", () => {
  it("normalizes the label and strips the session token", () => {
    const saved = createSavedLocation({ label: "  Home  ", location: PERTH });

    expect(saved.label).toBe("Home");
    expect(saved.location.sessionToken).toBeUndefined();
  });

  it("assigns an id and a creation timestamp", () => {
    const saved = createSavedLocation({ label: "Home", location: PERTH });

    expect(saved.id).not.toBe("");
    expect(Number.isFinite(saved.createdAt)).toBe(true);
  });

  it("assigns a unique id to each saved location", () => {
    const first = createSavedLocation({ label: "Home", location: PERTH });
    const second = createSavedLocation({ label: "Gym", location: PERTH });

    expect(first.id).not.toBe(second.id);
  });
});
