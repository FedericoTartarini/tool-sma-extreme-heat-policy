import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoolingSelection } from "@/domain/activeCooling";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import { DEFAULT_SPORT_TYPE } from "@/domain/sport";

const STORAGE_KEY = "home-cooling-selection:v1";

async function loadStore() {
  const { useCoolingSelectionStore } =
    await import("@/store/coolingSelectionStore");
  return useCoolingSelectionStore;
}

describe("coolingSelectionStore", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    vi.resetModules();
    storage = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts not configured without persisting a default", async () => {
    const store = await loadStore();

    expect(store.getState().selection).toEqual({ configured: false });
    expect(storage.size).toBe(0);
  });

  it.each<CoolingSelection>([
    { configured: false },
    { configured: true, selectedOptionIds: [] },
    { configured: true, selectedOptionIds: ["option-a"] },
  ])(
    "restores $configured / $selectedOptionIds without overwriting it",
    async (selection) => {
      const raw = JSON.stringify(selection);
      storage.set(STORAGE_KEY, raw);

      const store = await loadStore();

      expect(store.getState().selection).toEqual(selection);
      expect(storage.get(STORAGE_KEY)).toBe(raw);
    },
  );

  it("commits confirmed options and restores them after a reload", async () => {
    const store = await loadStore();

    expect(store.getState().saveSelection(["option-a", "option-b"])).toBe(true);
    expect(store.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: ["option-a", "option-b"],
    });
    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toEqual({
      configured: true,
      selectedOptionIds: ["option-a", "option-b"],
    });

    vi.resetModules();
    const reloadedStore = await loadStore();
    expect(reloadedStore.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: ["option-a", "option-b"],
    });
  });

  it("keeps a cleared selection configured after a reload", async () => {
    const store = await loadStore();
    store.getState().saveSelection(["option-a"]);

    expect(store.getState().saveSelection([])).toBe(true);
    expect(store.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: [],
    });

    vi.resetModules();
    const reloadedStore = await loadStore();
    expect(reloadedStore.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: [],
    });
  });

  it("deduplicates options and does not retain the caller's mutable draft", async () => {
    const store = await loadStore();
    const draft = ["option-b", "option-a", "option-b"];

    store.getState().saveSelection(draft);
    draft.push("option-c");

    expect(store.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: ["option-b", "option-a"],
    });
    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toEqual({
      configured: true,
      selectedOptionIds: ["option-b", "option-a"],
    });
  });

  it("rejects a failed save without changing memory and allows retry", async () => {
    const store = await loadStore();
    store.getState().saveSelection(["option-a"]);
    const originalRaw = storage.get(STORAGE_KEY);
    const localStorage = window.localStorage;
    vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {
      throw new Error("quota exceeded");
    });

    expect(store.getState().saveSelection([])).toBe(false);
    expect(store.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: ["option-a"],
    });
    expect(storage.get(STORAGE_KEY)).toBe(originalRaw);

    expect(store.getState().saveSelection([])).toBe(true);
    expect(store.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: [],
    });
  });

  it("recovers from corrupt storage on the next successful save", async () => {
    storage.set(STORAGE_KEY, "{broken-json");
    const store = await loadStore();

    expect(store.getState().selection).toEqual({ configured: false });
    expect(store.getState().saveSelection(["option-a"])).toBe(true);

    vi.resetModules();
    const reloadedStore = await loadStore();
    expect(reloadedStore.getState().selection).toEqual({
      configured: true,
      selectedOptionIds: ["option-a"],
    });
  });

  it.each(["direct", "shared"] as const)(
    "keeps preferences through %s Home bootstrap and filter changes",
    async (channel) => {
      storage.set(
        STORAGE_KEY,
        JSON.stringify({ configured: true, selectedOptionIds: ["option-a"] }),
      );
      const store = await loadStore();
      const { useHomeStore } = await import("@/store/homeStore");

      useHomeStore.getState().bootstrap({
        channel,
        profile: DEFAULT_HEAT_RISK_PROFILE,
        sport: DEFAULT_SPORT_TYPE,
        locationSearchInput: "Perth",
        locationPrefillSource: channel === "shared" ? "url" : "persisted",
        prefilledLocationResolveState: "pending",
      });
      useHomeStore.getState().selectLocation({
        id: "loc-sydney",
        displayLabel: "Sydney, Australia",
        name: "Sydney",
        countryName: "Australia",
        latitude: -33.8688,
        longitude: 151.2093,
      });
      useHomeStore.getState().setSport("RUNNING");

      expect(store.getState().selection).toEqual({
        configured: true,
        selectedOptionIds: ["option-a"],
      });
      expect(store.getState().saveSelection(["option-b"])).toBe(true);
      expect(JSON.parse(storage.get(STORAGE_KEY)!)).toEqual({
        configured: true,
        selectedOptionIds: ["option-b"],
      });
    },
  );

  it("stays usable without browser storage and reports save failure", async () => {
    vi.stubGlobal("window", undefined);
    const store = await loadStore();

    expect(store.getState().selection).toEqual({ configured: false });
    expect(store.getState().saveSelection([])).toBe(false);
    expect(store.getState().selection).toEqual({ configured: false });
  });
});
