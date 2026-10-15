import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoolingSelection } from "@/domain/activeCooling";
import {
  loadCoolingSelection,
  saveCoolingSelection,
} from "@/lib/coolingSelectionStorage";

const STORAGE_KEY = "home-cooling-selection:v1";

describe("coolingSelectionStorage", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
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

  it("defaults to not configured without writing to storage", () => {
    expect(loadCoolingSelection()).toEqual({ configured: false });
    expect(storage.size).toBe(0);
  });

  it.each<CoolingSelection>([
    { configured: false },
    { configured: true, selectedOptionIds: [] },
    { configured: true, selectedOptionIds: ["option-a", "option-b"] },
  ])(
    "restores the saved state $configured / $selectedOptionIds",
    (selection) => {
      expect(saveCoolingSelection(selection)).toBe(true);
      expect(JSON.parse(storage.get(STORAGE_KEY)!)).toEqual(selection);
      expect(loadCoolingSelection()).toEqual(selection);
    },
  );

  it.each([
    "{broken-json",
    "null",
    "[]",
    '"option-a"',
    "{}",
    '{"configured":"true","selectedOptionIds":[]}',
    '{"configured":true}',
    '{"configured":true,"selectedOptionIds":"option-a"}',
    '{"configured":true,"selectedOptionIds":["option-a",null,7]}',
  ])("ignores an invalid saved structure: %s", (raw) => {
    storage.set(STORAGE_KEY, raw);

    expect(loadCoolingSelection()).toEqual({ configured: false });
    expect(storage.get(STORAGE_KEY)).toBe(raw);
  });

  it("deduplicates saved IDs without assuming the final option list", () => {
    storage.set(
      STORAGE_KEY,
      JSON.stringify({
        configured: true,
        selectedOptionIds: ["option-b", "option-a", "option-b"],
      }),
    );

    expect(loadCoolingSelection()).toEqual({
      configured: true,
      selectedOptionIds: ["option-b", "option-a"],
    });
  });

  it("replaces a previous selection with a configured empty selection", () => {
    saveCoolingSelection({
      configured: true,
      selectedOptionIds: ["option-a"],
    });

    expect(
      saveCoolingSelection({ configured: true, selectedOptionIds: [] }),
    ).toBe(true);
    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toEqual({
      configured: true,
      selectedOptionIds: [],
    });
    expect(loadCoolingSelection()).toEqual({
      configured: true,
      selectedOptionIds: [],
    });
  });

  it("persists only cooling preferences and leaves Home filters intact", () => {
    const homeFilters = '{"sport":"RUNNING","loc":"Perth"}';
    storage.set("home-filters:v1", homeFilters);
    const selection = {
      configured: true as const,
      selectedOptionIds: ["option-a"],
      loc: "Sydney",
      translatedLabel: "Example",
    };

    saveCoolingSelection(selection);

    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toEqual({
      configured: true,
      selectedOptionIds: ["option-a"],
    });
    expect(storage.get("home-filters:v1")).toBe(homeFilters);
  });

  it("falls back when reading storage throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("storage blocked");
        },
      },
    });

    expect(loadCoolingSelection()).toEqual({ configured: false });
  });

  it("reports failure when writing storage throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
    });

    expect(
      saveCoolingSelection({ configured: true, selectedOptionIds: [] }),
    ).toBe(false);
  });

  it("handles denied access to the localStorage property", () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("access denied");
      },
    });

    expect(loadCoolingSelection()).toEqual({ configured: false });
    expect(saveCoolingSelection({ configured: false })).toBe(false);
  });

  it("is safe without a browser window", () => {
    vi.stubGlobal("window", undefined);

    expect(loadCoolingSelection()).toEqual({ configured: false });
    expect(saveCoolingSelection({ configured: false })).toBe(false);
  });
});
