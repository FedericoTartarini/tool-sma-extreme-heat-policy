import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import type { CoolingOptionId, CoolingSelection } from "@/domain/activeCooling";
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

  it("uses the formal option IDs for loading and saving", () => {
    expectTypeOf<ReturnType<typeof loadCoolingSelection>>().toEqualTypeOf<
      CoolingSelection<CoolingOptionId>
    >();
    expectTypeOf<Parameters<typeof saveCoolingSelection>[0]>().toEqualTypeOf<
      CoolingSelection<CoolingOptionId>
    >();
  });

  it("defaults to not configured without writing to storage", () => {
    expect(loadCoolingSelection()).toEqual({ configured: false });
    expect(storage.size).toBe(0);
  });

  it.each<CoolingSelection<CoolingOptionId>>([
    { configured: false },
    { configured: true, selectedOptionIds: [] },
    { configured: true, selectedOptionIds: ["fans", "water-dousing"] },
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
    '"fans"',
    "{}",
    '{"configured":"true","selectedOptionIds":[]}',
    '{"configured":true}',
    '{"configured":true,"selectedOptionIds":"fans"}',
    '{"configured":true,"selectedOptionIds":["fans",null,7]}',
  ])("ignores an invalid saved structure: %s", (raw) => {
    storage.set(STORAGE_KEY, raw);

    expect(loadCoolingSelection()).toEqual({ configured: false });
    expect(storage.get(STORAGE_KEY)).toBe(raw);
  });

  it("deduplicates valid saved IDs in their original order", () => {
    storage.set(
      STORAGE_KEY,
      JSON.stringify({
        configured: true,
        selectedOptionIds: ["water-dousing", "fans", "water-dousing"],
      }),
    );

    expect(loadCoolingSelection()).toEqual({
      configured: true,
      selectedOptionIds: ["water-dousing", "fans"],
    });
  });

  it.each([
    {
      ids: ["fans", "unknown-option", "water-dousing", "fans"],
      expected: ["fans", "water-dousing"],
    },
    { ids: ["unknown-option", "another-unknown"], expected: [] },
  ])(
    "filters unknown IDs while preserving configured state: $ids",
    ({ ids, expected }) => {
      const raw = JSON.stringify({ configured: true, selectedOptionIds: ids });
      storage.set(STORAGE_KEY, raw);
      const write = vi.spyOn(window.localStorage, "setItem");

      expect(loadCoolingSelection()).toEqual({
        configured: true,
        selectedOptionIds: expected,
      });
      expect(storage.get(STORAGE_KEY)).toBe(raw);
      expect(write).not.toHaveBeenCalled();
    },
  );

  it("replaces a previous selection with a configured empty selection", () => {
    saveCoolingSelection({
      configured: true,
      selectedOptionIds: ["fans"],
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
      selectedOptionIds: ["fans"] as const,
      loc: "Sydney",
      translatedLabel: "Example",
    };

    saveCoolingSelection(selection);

    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toEqual({
      configured: true,
      selectedOptionIds: ["fans"],
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
