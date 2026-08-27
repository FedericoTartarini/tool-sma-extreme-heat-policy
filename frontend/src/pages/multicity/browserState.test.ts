import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SAVED_LOCATIONS } from "@/domain/multicity";
import { SportType, SPORT_TYPE_VALUES } from "@/domain/sport";
import {
  loadPersistedMulticityState,
  resolveInitialMulticityLocations,
  resolveInitialMulticitySport,
  savePersistedMulticityState,
} from "@/pages/multicity/browserState";

const MULTICITY_STORAGE_KEY = "multicity-locations:v1";

interface LocalStorageMock {
  clear: () => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

function installWindowMock(): Map<string, string> {
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
  };

  vi.stubGlobal("window", {
    localStorage,
  });

  return storage;
}

describe("multicity browserState", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads persisted dashboard state", () => {
    storage.set(
      MULTICITY_STORAGE_KEY,
      JSON.stringify({
        sport: SportType.Soccer,
        locations: [
          {
            id: "location-1",
            displayLabel: "Sydney, New South Wales, Australia",
            name: "Sydney",
            regionName: "New South Wales",
            countryName: "Australia",
            latitude: -33.847,
            longitude: 151.067,
          },
        ],
      }),
    );

    expect(loadPersistedMulticityState(SPORT_TYPE_VALUES)).toEqual({
      sport: SportType.Soccer,
      locations: [
        {
          id: "location-1",
          displayLabel: "Sydney, New South Wales, Australia",
          name: "Sydney",
          regionName: "New South Wales",
          countryName: "Australia",
          latitude: -33.847,
          longitude: 151.067,
        },
      ],
    });
  });

  it("defaults to an empty location list when nothing is persisted", () => {
    expect(resolveInitialMulticityLocations(null)).toEqual([]);
    expect(resolveInitialMulticitySport(null)).toBe(SportType.Soccer);
  });

  it("keeps saved locations when the persisted sport is invalid", () => {
    storage.set(
      MULTICITY_STORAGE_KEY,
      JSON.stringify({
        sport: "NOT_A_SPORT",
        locations: [
          {
            id: "location-1",
            displayLabel: "Sydney, New South Wales, Australia",
            name: "Sydney",
            countryName: "Australia",
            latitude: -33.847,
            longitude: 151.067,
          },
        ],
      }),
    );

    const persistedState = loadPersistedMulticityState(SPORT_TYPE_VALUES);

    expect(persistedState?.sport).toBe(SportType.Soccer);
    expect(persistedState?.locations).toHaveLength(1);
    expect(persistedState?.locations[0]?.name).toBe("Sydney");
  });

  it("caps persisted locations at the dashboard maximum", () => {
    const locations = Array.from(
      { length: MAX_SAVED_LOCATIONS + 1 },
      (_, index) => ({
        id: `location-${index}`,
        displayLabel: `City ${index}`,
        name: `City ${index}`,
        countryName: "Australia",
        latitude: -33 + index * 0.01,
        longitude: 151 + index * 0.01,
      }),
    );

    storage.set(
      MULTICITY_STORAGE_KEY,
      JSON.stringify({
        sport: SportType.Soccer,
        locations,
      }),
    );

    const persistedState = loadPersistedMulticityState(SPORT_TYPE_VALUES);

    expect(persistedState?.locations).toHaveLength(MAX_SAVED_LOCATIONS);
    expect(persistedState?.locations[0]?.id).toBe("location-0");
    expect(persistedState?.locations.at(-1)?.id).toBe(
      `location-${MAX_SAVED_LOCATIONS - 1}`,
    );
  });

  it("persists dashboard state", () => {
    savePersistedMulticityState({
      sport: SportType.Croquet,
      locations: [],
    });

    expect(storage.get(MULTICITY_STORAGE_KEY)).toBe(
      JSON.stringify({
        sport: SportType.Croquet,
        locations: [],
      }),
    );
  });
});
