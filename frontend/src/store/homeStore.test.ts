import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import type { LocationSuggestion } from "@/domain/location";
import { DEFAULT_SPORT_TYPE } from "@/domain/sport";
import { useHomeStore } from "@/store/homeStore";

const INITIAL_SESSION_TOKEN = "session-initial";

const DAMPER_LOCATION: LocationSuggestion = {
  id: "loc-dampier",
  displayLabel: "Dampier, Western Australia, Australia",
  name: "Dampier",
  regionName: "Western Australia",
  countryName: "Australia",
  mapboxId: "mapbox-dampier",
  countryCode: "AU",
  latitude: -20.6628,
  longitude: 116.7127,
  sessionToken: "session-dampier",
};

const PERTH_LOCATION: LocationSuggestion = {
  id: "loc-perth",
  displayLabel: "Perth, Western Australia, Australia",
  name: "Perth",
  regionName: "Western Australia",
  countryName: "Australia",
  mapboxId: "mapbox-perth",
  countryCode: "AU",
  latitude: -31.9523,
  longitude: 115.8613,
  sessionToken: "session-perth",
};

function resetHomeStore() {
  useHomeStore.setState({
    isBootstrapped: false,
    channel: "direct",
    profile: DEFAULT_HEAT_RISK_PROFILE,
    sport: DEFAULT_SPORT_TYPE,
    locationSearchInput: "",
    locationPrefillSource: "none",
    selectedLocation: null,
    shouldAutoResolvePrefilledLocation: false,
    hasPrefilledLocationNotMatched: false,
    locationSessionToken: INITIAL_SESSION_TOKEN,
  });
}

describe("homeStore location search", () => {
  beforeEach(() => {
    resetHomeStore();
  });

  afterEach(() => {
    resetHomeStore();
  });

  it("clears the committed selection and preserves the draft when editing a location", () => {
    useHomeStore.getState().selectLocation(DAMPER_LOCATION);

    useHomeStore.getState().setLocationSearchInput("P");

    expect(useHomeStore.getState()).toMatchObject({
      locationSearchInput: "P",
      selectedLocation: null,
    });
  });

  it("refreshes the session token only when a new search starts", () => {
    useHomeStore.getState().selectLocation(DAMPER_LOCATION);

    useHomeStore.getState().setLocationSearchInput("P");
    const tokenAfterFirstEdit = useHomeStore.getState().locationSessionToken;

    useHomeStore.getState().setLocationSearchInput("Pe");

    expect(tokenAfterFirstEdit).not.toBe(INITIAL_SESSION_TOKEN);
    expect(useHomeStore.getState().locationSessionToken).toBe(
      tokenAfterFirstEdit,
    );
  });

  it("keeps the committed selection when the input still matches it", () => {
    useHomeStore.getState().selectLocation(DAMPER_LOCATION);

    useHomeStore
      .getState()
      .setLocationSearchInput(DAMPER_LOCATION.displayLabel);

    expect(useHomeStore.getState()).toMatchObject({
      locationSearchInput: DAMPER_LOCATION.displayLabel,
      selectedLocation: DAMPER_LOCATION,
      locationSessionToken: INITIAL_SESSION_TOKEN,
    });
  });

  it("restores a committed selection and formatted label after choosing a new suggestion", () => {
    useHomeStore.getState().selectLocation(DAMPER_LOCATION);
    useHomeStore.getState().setLocationSearchInput("Per");

    useHomeStore.getState().selectLocation(PERTH_LOCATION);

    expect(useHomeStore.getState()).toMatchObject({
      locationSearchInput: PERTH_LOCATION.displayLabel,
      selectedLocation: PERTH_LOCATION,
    });
  });

  it("keeps the current sport and location selection when the profile changes", () => {
    useHomeStore.getState().setSport("RUNNING");
    useHomeStore.getState().selectLocation(DAMPER_LOCATION);

    useHomeStore.getState().setProfile("AGE_14_17");

    expect(useHomeStore.getState()).toMatchObject({
      profile: "AGE_14_17",
      sport: "RUNNING",
      locationSearchInput: DAMPER_LOCATION.displayLabel,
      selectedLocation: DAMPER_LOCATION,
    });
  });
});
