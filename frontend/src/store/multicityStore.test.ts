import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SPORT_TYPE, SportType } from "@/domain/sport";
import type { LocationSuggestion } from "@/domain/location";
import { useMulticityStore } from "@/store/multicityStore";

const SYDNEY_LOCATION: LocationSuggestion = {
  id: "suggestion-sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  mapboxId: "mapbox-sydney",
  latitude: -33.847,
  longitude: 151.067,
};

const MELBOURNE_LOCATION: LocationSuggestion = {
  id: "suggestion-melbourne",
  displayLabel: "Melbourne, Victoria, Australia",
  name: "Melbourne",
  regionName: "Victoria",
  countryName: "Australia",
  mapboxId: "mapbox-melbourne",
  latitude: -37.813,
  longitude: 144.963,
};

function resetMulticityStore() {
  useMulticityStore.setState({
    isBootstrapped: false,
    sport: DEFAULT_SPORT_TYPE,
    locations: [],
    locationSearchInput: "",
    locationSessionToken: "session-initial",
  });
}

describe("multicityStore", () => {
  beforeEach(() => {
    resetMulticityStore();
  });

  afterEach(() => {
    resetMulticityStore();
  });

  it("bootstraps with persisted sport and locations", () => {
    useMulticityStore.getState().bootstrap({
      sport: SportType.Croquet,
      locations: [
        {
          id: "location-1",
          displayLabel: SYDNEY_LOCATION.displayLabel,
          name: SYDNEY_LOCATION.name,
          regionName: SYDNEY_LOCATION.regionName,
          countryName: SYDNEY_LOCATION.countryName,
          latitude: SYDNEY_LOCATION.latitude as number,
          longitude: SYDNEY_LOCATION.longitude as number,
        },
      ],
    });

    expect(useMulticityStore.getState()).toMatchObject({
      isBootstrapped: true,
      sport: SportType.Croquet,
      locations: [
        expect.objectContaining({
          name: "Sydney",
        }),
      ],
    });
  });

  it("adds, reorders, and removes saved locations", () => {
    expect(useMulticityStore.getState().addLocation(SYDNEY_LOCATION)).toEqual({
      ok: true,
    });
    expect(
      useMulticityStore.getState().addLocation(MELBOURNE_LOCATION),
    ).toEqual({
      ok: true,
    });

    const firstLocationId = useMulticityStore.getState().locations[0]?.id;
    expect(firstLocationId).toBeDefined();

    useMulticityStore.getState().moveLocationDown(firstLocationId as string);

    expect(
      useMulticityStore.getState().locations.map((location) => location.name),
    ).toEqual(["Melbourne", "Sydney"]);

    useMulticityStore.getState().removeLocation(firstLocationId as string);

    expect(useMulticityStore.getState().locations).toHaveLength(1);
    expect(useMulticityStore.getState().locations[0]?.name).toBe("Melbourne");
  });

  it("rejects duplicate locations", () => {
    expect(useMulticityStore.getState().addLocation(SYDNEY_LOCATION)).toEqual({
      ok: true,
    });
    expect(useMulticityStore.getState().addLocation(SYDNEY_LOCATION)).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });
});
