import { describe, expect, it } from "vitest";
import {
  ACTIVE_COOLING_METHOD_IDS,
  type ActiveCoolingMethodId,
  type ActiveCoolingOptionMap,
  type CoolingSelection,
  resolveActiveCoolingAdvice,
} from "@/domain/activeCooling";

const EXPECTED_METHOD_IDS: readonly ActiveCoolingMethodId[] = [
  "cold-fluids-or-slushies",
  "arm-or-foot-immersion",
  "water-dousing",
  "ice-packs-or-towels",
  "fans",
];

type TestOptionId = "option-a" | "option-b" | "option-c";

const TEST_OPTION_MAP: ActiveCoolingOptionMap<string> = {
  "option-a": ["water-dousing", "cold-fluids-or-slushies"],
  "option-b": ["fans", "water-dousing"],
  "option-c": ["ice-packs-or-towels"],
};

describe("ACTIVE_COOLING_METHOD_IDS", () => {
  it("identifies all five policy methods in display order", () => {
    expect(ACTIVE_COOLING_METHOD_IDS).toEqual(EXPECTED_METHOD_IDS);
  });

  it("assigns a unique stable id to each policy method", () => {
    expect(new Set(ACTIVE_COOLING_METHOD_IDS).size).toBe(
      ACTIVE_COOLING_METHOD_IDS.length,
    );
  });
});

describe("resolveActiveCoolingAdvice", () => {
  it("shows every method without a reminder before setup", () => {
    expect(
      resolveActiveCoolingAdvice({ configured: false }, TEST_OPTION_MAP),
    ).toEqual({
      visibleMethodIds: EXPECTED_METHOD_IDS,
      showPrepareReminder: false,
    });
  });

  it("shows every method with a reminder when setup has no selections", () => {
    expect(
      resolveActiveCoolingAdvice(
        { configured: true, selectedOptionIds: [] },
        TEST_OPTION_MAP,
      ),
    ).toEqual({
      visibleMethodIds: EXPECTED_METHOD_IDS,
      showPrepareReminder: true,
    });
  });

  it("resolves a single selected option", () => {
    expect(
      resolveActiveCoolingAdvice(
        { configured: true, selectedOptionIds: ["option-a"] },
        TEST_OPTION_MAP,
      ),
    ).toEqual({
      visibleMethodIds: ["cold-fluids-or-slushies", "water-dousing"],
      showPrepareReminder: false,
    });
  });

  it("deduplicates mapped methods and preserves policy order", () => {
    expect(
      resolveActiveCoolingAdvice(
        {
          configured: true,
          selectedOptionIds: ["option-b", "option-a"],
        },
        TEST_OPTION_MAP,
      ),
    ).toEqual({
      visibleMethodIds: ["cold-fluids-or-slushies", "water-dousing", "fans"],
      showPrepareReminder: false,
    });
  });

  it("ignores unknown options while resolving valid selections", () => {
    const selection: CoolingSelection<string> = {
      configured: true,
      selectedOptionIds: ["unknown", "option-c"],
    };

    expect(resolveActiveCoolingAdvice(selection, TEST_OPTION_MAP)).toEqual({
      visibleMethodIds: ["ice-packs-or-towels"],
      showPrepareReminder: false,
    });
  });

  it("falls back safely when every selected option is unknown", () => {
    const selection: CoolingSelection<string> = {
      configured: true,
      selectedOptionIds: ["unknown"],
    };

    expect(resolveActiveCoolingAdvice(selection, TEST_OPTION_MAP)).toEqual({
      visibleMethodIds: EXPECTED_METHOD_IDS,
      showPrepareReminder: true,
    });
  });

  it("does not mutate the selection or option mapping", () => {
    const selectedOptionIds = ["option-b", "option-a"] as const;
    const selection: CoolingSelection<TestOptionId> = {
      configured: true,
      selectedOptionIds,
    };
    const selectionSnapshot = structuredClone(selection);
    const mapSnapshot = structuredClone(TEST_OPTION_MAP);

    resolveActiveCoolingAdvice(selection, TEST_OPTION_MAP);

    expect(selection).toEqual(selectionSnapshot);
    expect(TEST_OPTION_MAP).toEqual(mapSnapshot);
  });
});
