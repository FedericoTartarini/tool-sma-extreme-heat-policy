import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HEAT_RISK_PROFILE_VALUES } from "@/domain/heatRiskProfile";
import { SportType, SPORT_TYPE_VALUES } from "@/domain/sport";
import {
  loadPersistedHomeFilters,
  savePersistedHomeFilters,
} from "@/pages/home/browserState";

const HOME_FILTERS_STORAGE_KEY = "home-filters:v1";

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

describe("home browserState", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads persisted filters with an explicit profile", () => {
    storage.set(
      HOME_FILTERS_STORAGE_KEY,
      JSON.stringify({
        profile: "UNDER_10",
        sport: SportType.Running,
        loc: "  Perth, Western Australia, Australia  ",
      }),
    );

    expect(
      loadPersistedHomeFilters(SPORT_TYPE_VALUES, HEAT_RISK_PROFILE_VALUES),
    ).toEqual({
      profile: "UNDER_10",
      sport: SportType.Running,
      loc: "Perth, Western Australia, Australia",
    });
  });

  it("defaults the profile to ADULT for older persisted data", () => {
    storage.set(
      HOME_FILTERS_STORAGE_KEY,
      JSON.stringify({
        sport: SportType.Basketball,
        loc: "North Sydney, New South Wales, Australia",
      }),
    );

    expect(
      loadPersistedHomeFilters(SPORT_TYPE_VALUES, HEAT_RISK_PROFILE_VALUES),
    ).toEqual({
      profile: "ADULT",
      sport: SportType.Basketball,
      loc: "North Sydney, New South Wales, Australia",
    });
  });

  it("defaults the profile to ADULT when persisted data still uses KIDS", () => {
    storage.set(
      HOME_FILTERS_STORAGE_KEY,
      JSON.stringify({
        profile: "KIDS",
        sport: SportType.Basketball,
        loc: "North Sydney, New South Wales, Australia",
      }),
    );

    expect(
      loadPersistedHomeFilters(SPORT_TYPE_VALUES, HEAT_RISK_PROFILE_VALUES),
    ).toEqual({
      profile: "ADULT",
      sport: SportType.Basketball,
      loc: "North Sydney, New South Wales, Australia",
    });
  });

  it("persists the current profile with the latest filters", () => {
    savePersistedHomeFilters({
      profile: "AGE_14_17",
      sport: SportType.Soccer,
      loc: "Campbell Creek, Queensland, Australia",
    });

    expect(storage.get(HOME_FILTERS_STORAGE_KEY)).toBe(
      JSON.stringify({
        profile: "AGE_14_17",
        sport: SportType.Soccer,
        loc: "Campbell Creek, Queensland, Australia",
      }),
    );
  });
});
