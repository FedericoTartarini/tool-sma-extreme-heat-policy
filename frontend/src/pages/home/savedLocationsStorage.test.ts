import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedLocation } from "@/domain/savedLocation";
import {
  loadSavedLocations,
  saveSavedLocations,
} from "@/pages/home/savedLocationsStorage";

const SAVED_LOCATIONS_STORAGE_KEY = "saved-locations:v1";

interface LocalStorageMock {
  clear: () => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

function installWindowMock(
  overrides: Partial<LocalStorageMock> = {},
): Map<string, string> {
  const storage = new Map<string, string>();
  const localStorage: LocalStorageMock = {
    clear: () => storage.clear(),
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => {
      storage.delete(key);
    },
    setItem: (key, value) => {
      storage.set(key, value);
    },
    ...overrides,
  };

  vi.stubGlobal("window", { localStorage });

  return storage;
}

function toSavedLocation(
  overrides: Partial<SavedLocation> = {},
): SavedLocation {
  return {
    id: "saved-home",
    label: "Home",
    location: {
      id: "loc-perth",
      displayLabel: "Perth, Western Australia, Australia",
      name: "Perth",
      regionName: "Western Australia",
      countryName: "Australia",
      latitude: -31.9523,
      longitude: 115.8613,
    },
    createdAt: 1,
    ...overrides,
  };
}

describe("savedLocationsStorage", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty list when nothing is persisted", () => {
    expect(loadSavedLocations()).toEqual([]);
  });

  it("round-trips a persisted list under the versioned key", () => {
    const list = [
      toSavedLocation(),
      toSavedLocation({ id: "saved-gym", label: "Gym" }),
    ];

    saveSavedLocations(list);

    expect(storage.has(SAVED_LOCATIONS_STORAGE_KEY)).toBe(true);
    expect(loadSavedLocations()).toEqual(list);
  });

  it("returns an empty list for malformed JSON", () => {
    storage.set(SAVED_LOCATIONS_STORAGE_KEY, "{not-json");

    expect(loadSavedLocations()).toEqual([]);
  });

  it("returns an empty list when the payload is not an array", () => {
    storage.set(
      SAVED_LOCATIONS_STORAGE_KEY,
      JSON.stringify({ id: "saved-home" }),
    );

    expect(loadSavedLocations()).toEqual([]);
  });

  it("discards the whole list when an entry is missing required fields", () => {
    storage.set(
      SAVED_LOCATIONS_STORAGE_KEY,
      JSON.stringify([toSavedLocation(), { id: "saved-gym" }]),
    );

    expect(loadSavedLocations()).toEqual([]);
  });

  it("discards the whole list when an entry has no coordinates", () => {
    const unusable = toSavedLocation({
      id: "saved-gym",
      location: {
        id: "loc-sydney",
        displayLabel: "Sydney, New South Wales, Australia",
        name: "Sydney",
        countryName: "Australia",
      },
    });

    storage.set(
      SAVED_LOCATIONS_STORAGE_KEY,
      JSON.stringify([toSavedLocation(), unusable]),
    );

    expect(loadSavedLocations()).toEqual([]);
  });

  it("swallows write failures so the UI stays unblocked", () => {
    vi.unstubAllGlobals();
    installWindowMock({
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });

    expect(() => saveSavedLocations([toSavedLocation()])).not.toThrow();
  });

  it("is inert without a window", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("window", undefined);

    expect(loadSavedLocations()).toEqual([]);
    expect(() => saveSavedLocations([toSavedLocation()])).not.toThrow();
  });
});
