import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HOME_UI_PREFERENCES,
  useHomeUiStore,
} from "@/store/homeUiStore";

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

describe("useHomeUiStore", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
    useHomeUiStore.setState(DEFAULT_HOME_UI_PREFERENCES);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates weather-details visibility", () => {
    useHomeUiStore.getState().setShowWeatherDetails(true);

    expect(useHomeUiStore.getState()).toMatchObject({
      showWeatherDetails: true,
    });
  });

  it("persists weather-details visibility to localStorage", () => {
    useHomeUiStore.getState().setShowWeatherDetails(true);

    expect(storage.get(HOME_UI_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({ showWeatherDetails: true }),
    );
  });

  it("loads persisted weather-details visibility when the store is created", async () => {
    storage.set(
      HOME_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ showWeatherDetails: true }),
    );

    const { useHomeUiStore: freshStore } = await importFreshHomeUiStore();

    expect(freshStore.getState().showWeatherDetails).toBe(true);
  });

  it("defaults to hidden when nothing is persisted", async () => {
    const { useHomeUiStore: freshStore } = await importFreshHomeUiStore();

    expect(freshStore.getState().showWeatherDetails).toBe(false);
    expect(storage.has(HOME_UI_PREFERENCES_STORAGE_KEY)).toBe(false);
  });
});

async function importFreshHomeUiStore(): Promise<
  typeof import("@/store/homeUiStore")
> {
  vi.resetModules();
  return import("@/store/homeUiStore");
}
