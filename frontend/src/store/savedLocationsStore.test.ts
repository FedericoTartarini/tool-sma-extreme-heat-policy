import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocationSuggestion } from "@/domain/location";
import {
  SAVED_LOCATIONS_MAX,
  type SavedLocation,
} from "@/domain/savedLocation";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

const SAVED_LOCATIONS_STORAGE_KEY = "saved-locations:v1";

const PERTH: LocationSuggestion = {
  id: "loc-perth",
  displayLabel: "Perth, Western Australia, Australia",
  name: "Perth",
  regionName: "Western Australia",
  countryName: "Australia",
  latitude: -31.9523,
  longitude: 115.8613,
  sessionToken: "session-perth",
};

const SYDNEY: LocationSuggestion = {
  id: "loc-sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  latitude: -33.8688,
  longitude: 151.2093,
};

function installWindowMock(): Map<string, string> {
  const storage = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  });

  return storage;
}

function readPersisted(storage: Map<string, string>): SavedLocation[] {
  return JSON.parse(
    storage.get(SAVED_LOCATIONS_STORAGE_KEY) ?? "[]",
  ) as SavedLocation[];
}

function seedSavedLocations(count: number): void {
  const store = useSavedLocationsStore.getState();

  for (let index = 0; index < count; index += 1) {
    store.saveLocation({ label: `Spot ${index}`, location: PERTH });
  }
}

describe("savedLocationsStore", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
    useSavedLocationsStore.setState({ savedLocations: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useSavedLocationsStore.setState({ savedLocations: [] });
  });

  it("saves a location newest first with a trimmed label", () => {
    useSavedLocationsStore
      .getState()
      .saveLocation({ label: "Home", location: SYDNEY });
    const result = useSavedLocationsStore
      .getState()
      .saveLocation({ label: "  Gym  ", location: PERTH });

    const { savedLocations } = useSavedLocationsStore.getState();
    expect(result).toEqual({ status: "saved", id: savedLocations[0].id });
    expect(savedLocations.map((saved) => saved.label)).toEqual(["Gym", "Home"]);
  });

  it("persists saved locations without the session token", () => {
    useSavedLocationsStore
      .getState()
      .saveLocation({ label: "Gym", location: PERTH });

    const persisted = readPersisted(storage);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].location.sessionToken).toBeUndefined();
    expect(persisted[0].location.latitude).toBe(PERTH.latitude);
  });

  it("rejects a location without coordinates", () => {
    const result = useSavedLocationsStore.getState().saveLocation({
      label: "Gym",
      location: { ...PERTH, latitude: undefined, longitude: undefined },
    });

    expect(result).toEqual({
      status: "rejected",
      reason: "missing_coordinates",
    });
    expect(useSavedLocationsStore.getState().savedLocations).toEqual([]);
  });

  it("rejects a blank label", () => {
    const result = useSavedLocationsStore
      .getState()
      .saveLocation({ label: "   ", location: PERTH });

    expect(result).toEqual({ status: "rejected", reason: "empty_label" });
  });

  it("rejects a duplicate label regardless of case", () => {
    useSavedLocationsStore
      .getState()
      .saveLocation({ label: "Home", location: SYDNEY });

    const result = useSavedLocationsStore
      .getState()
      .saveLocation({ label: " home ", location: PERTH });

    expect(result).toEqual({ status: "rejected", reason: "duplicate_label" });
    expect(useSavedLocationsStore.getState().savedLocations).toHaveLength(1);
  });

  it("rejects a save once the limit is reached", () => {
    seedSavedLocations(SAVED_LOCATIONS_MAX);

    const result = useSavedLocationsStore
      .getState()
      .saveLocation({ label: "One too many", location: PERTH });

    expect(result).toEqual({ status: "rejected", reason: "limit_reached" });
    expect(useSavedLocationsStore.getState().savedLocations).toHaveLength(
      SAVED_LOCATIONS_MAX,
    );
  });

  it("removes an entry and persists the shorter list", () => {
    useSavedLocationsStore
      .getState()
      .saveLocation({ label: "Home", location: SYDNEY });
    useSavedLocationsStore
      .getState()
      .saveLocation({ label: "Gym", location: PERTH });
    const [gym] = useSavedLocationsStore.getState().savedLocations;

    useSavedLocationsStore.getState().removeLocation(gym.id);

    expect(
      useSavedLocationsStore
        .getState()
        .savedLocations.map((saved) => saved.label),
    ).toEqual(["Home"]);
    expect(readPersisted(storage)).toHaveLength(1);
  });
});
