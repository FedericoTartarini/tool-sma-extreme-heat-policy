import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadPersistedHomeUiPreferences,
  savePersistedHomeUiPreferences,
} from "@/lib/homeUiPreferencesStorage";

const HOME_UI_PREFERENCES_STORAGE_KEY = "home-ui-preferences:v1";

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

describe("homeUiPreferencesStorage", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads persisted weather-details visibility", () => {
    storage.set(
      HOME_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ showWeatherDetails: true }),
    );

    expect(loadPersistedHomeUiPreferences()).toEqual({
      showWeatherDetails: true,
    });
  });

  it("returns an empty object when no preferences are stored", () => {
    expect(loadPersistedHomeUiPreferences()).toEqual({});
  });

  it("ignores invalid persisted payloads", () => {
    storage.set(HOME_UI_PREFERENCES_STORAGE_KEY, "not-json");

    expect(loadPersistedHomeUiPreferences()).toEqual({});
  });

  it("persists weather-details visibility", () => {
    savePersistedHomeUiPreferences({ showWeatherDetails: true });

    expect(storage.get(HOME_UI_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({ showWeatherDetails: true }),
    );
  });
});
