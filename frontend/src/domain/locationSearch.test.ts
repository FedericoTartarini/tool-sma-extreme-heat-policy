import { describe, expect, it } from "vitest";
import type { LocationSuggestion } from "@/domain/location";
import {
  normalizeLocationSearchText,
  prepareLocationSuggestions,
  resolvePrefilledLocationSuggestion,
  shouldOpenPrefilledLocationDropdown,
} from "@/domain/locationSearch";

function createSuggestion(
  overrides: Partial<LocationSuggestion> & {
    id: string;
    displayLabel: string;
    name: string;
    countryName?: string;
  },
): LocationSuggestion {
  return {
    id: overrides.id,
    displayLabel: overrides.displayLabel,
    name: overrides.name,
    regionName: overrides.regionName,
    countryName: overrides.countryName ?? "Australia",
    mapboxId: overrides.mapboxId ?? overrides.id,
    countryCode: overrides.countryCode ?? "AU",
    sessionToken: overrides.sessionToken ?? "session-test",
    latitude: overrides.latitude,
    longitude: overrides.longitude,
  };
}

describe("normalizeLocationSearchText", () => {
  it("normalizes case and punctuation for matching", () => {
    expect(normalizeLocationSearchText(" Auburn, NSW / AU ")).toBe(
      "auburn nsw au",
    );
  });
});

describe("prepareLocationSuggestions", () => {
  it("collapses duplicate location suggestions by name, region, and country", () => {
    const prepared = prepareLocationSuggestions({
      suggestions: [
        createSuggestion({
          id: "auburn-a",
          displayLabel: "Auburn, New South Wales, Australia",
          name: "Auburn",
          regionName: "New South Wales",
        }),
        createSuggestion({
          id: "auburn-b",
          displayLabel: "Auburn, New South Wales, Australia",
          name: "Auburn",
          regionName: "New South Wales",
        }),
      ],
    });

    expect(prepared.dedupedSuggestions).toHaveLength(1);
    expect(prepared.visibleSuggestions).toEqual([
      expect.objectContaining({ id: "auburn-a" }),
    ]);
  });

  it("keeps same-name locations from different regions visible", () => {
    const prepared = prepareLocationSuggestions({
      suggestions: [
        createSuggestion({
          id: "richmond-vic",
          displayLabel: "Richmond, Victoria, Australia",
          name: "Richmond",
          regionName: "Victoria",
        }),
        createSuggestion({
          id: "richmond-nsw",
          displayLabel: "Richmond, New South Wales, Australia",
          name: "Richmond",
          regionName: "New South Wales",
        }),
      ],
    });

    expect(
      prepared.visibleSuggestions.map((suggestion) => suggestion.id),
    ).toEqual(["richmond-vic", "richmond-nsw"]);
  });

  it("caps the visible list at three suggestions", () => {
    const prepared = prepareLocationSuggestions({
      suggestions: [
        createSuggestion({
          id: "sydney",
          displayLabel: "Sydney, New South Wales, Australia",
          name: "Sydney",
          regionName: "New South Wales",
        }),
        createSuggestion({
          id: "north-sydney",
          displayLabel: "North Sydney, New South Wales, Australia",
          name: "North Sydney",
          regionName: "New South Wales",
        }),
        createSuggestion({
          id: "sydney-olympic-park",
          displayLabel: "Sydney Olympic Park, New South Wales, Australia",
          name: "Sydney Olympic Park",
          regionName: "New South Wales",
        }),
        createSuggestion({
          id: "sydney-mines",
          displayLabel: "Sydney Mines, Nova Scotia, Canada",
          name: "Sydney Mines",
          regionName: "Nova Scotia",
          countryName: "Canada",
          countryCode: "CA",
        }),
      ],
    });

    expect(prepared.visibleSuggestions).toHaveLength(3);
  });
});

describe("resolvePrefilledLocationSuggestion", () => {
  it.each(["url", "persisted"] as const)(
    "matches exact canonical readable labels from %s prefill",
    (prefillSource) => {
      const suggestion = createSuggestion({
        id: "auburn",
        displayLabel: "Auburn, New South Wales, Australia",
        name: "Auburn",
        regionName: "New South Wales",
      });

      expect(
        resolvePrefilledLocationSuggestion({
          suggestions: [suggestion],
          value: "Auburn, New South Wales, Australia",
          prefillSource,
        }),
      ).toBe(suggestion);
    },
  );

  it("rejects non-canonical URL prefill labels", () => {
    expect(
      resolvePrefilledLocationSuggestion({
        suggestions: [
          createSuggestion({
            id: "darwin",
            displayLabel: "Darwin, Northern Territory, Australia",
            name: "Darwin",
            regionName: "Northern Territory",
          }),
        ],
        value: "Darwin, AU",
        prefillSource: "url",
      }),
    ).toBeNull();
  });

  it("rejects non-canonical persisted prefill labels", () => {
    expect(
      resolvePrefilledLocationSuggestion({
        suggestions: [
          createSuggestion({
            id: "auburn",
            displayLabel: "Auburn, New South Wales, Australia",
            name: "Auburn",
            regionName: "New South Wales",
          }),
        ],
        value: "Auburn, NSW, AU",
        prefillSource: "persisted",
      }),
    ).toBeNull();
  });

  it("rejects non-canonical labels even when multiple suggestions could match by name", () => {
    expect(
      resolvePrefilledLocationSuggestion({
        suggestions: [
          createSuggestion({
            id: "richmond-vic",
            displayLabel: "Richmond, Victoria, Australia",
            name: "Richmond",
            regionName: "Victoria",
          }),
          createSuggestion({
            id: "richmond-nsw",
            displayLabel: "Richmond, New South Wales, Australia",
            name: "Richmond",
            regionName: "New South Wales",
          }),
        ],
        value: "Richmond, AU",
        prefillSource: "url",
      }),
    ).toBeNull();
  });

  it("uses the first result only for default prefill fallback", () => {
    const suggestion = createSuggestion({
      id: "sydney",
      displayLabel: "Sydney, New South Wales, Australia",
      name: "Sydney",
      regionName: "New South Wales",
    });

    expect(
      resolvePrefilledLocationSuggestion({
        suggestions: [suggestion],
        value: "Default Sydney label",
        prefillSource: "default",
      }),
    ).toBe(suggestion);
  });
});

describe("shouldOpenPrefilledLocationDropdown", () => {
  it.each(["url", "persisted"] as const)(
    "opens candidates for non-canonical %s prefill values",
    (prefillSource) => {
      const suggestion = createSuggestion({
        id: "darwin",
        displayLabel: "Darwin, Northern Territory, Australia",
        name: "Darwin",
        regionName: "Northern Territory",
      });

      expect(
        shouldOpenPrefilledLocationDropdown({
          suggestions: [suggestion],
          visibleSuggestions: [suggestion],
          value: "Darwin, AU",
          prefillSource,
          isSuggestSuccess: true,
        }),
      ).toBe(true);
    },
  );

  it.each(["url", "persisted"] as const)(
    "does not open candidates for exact %s prefill matches",
    (prefillSource) => {
      const suggestion = createSuggestion({
        id: "auburn",
        displayLabel: "Auburn, New South Wales, Australia",
        name: "Auburn",
        regionName: "New South Wales",
      });

      expect(
        shouldOpenPrefilledLocationDropdown({
          suggestions: [suggestion],
          visibleSuggestions: [suggestion],
          value: "Auburn, New South Wales, Australia",
          prefillSource,
          isSuggestSuccess: true,
        }),
      ).toBe(false);
    },
  );

  it("does not open candidates for default prefill fallback", () => {
    const suggestion = createSuggestion({
      id: "sydney",
      displayLabel: "Sydney, New South Wales, Australia",
      name: "Sydney",
      regionName: "New South Wales",
    });

    expect(
      shouldOpenPrefilledLocationDropdown({
        suggestions: [suggestion],
        visibleSuggestions: [suggestion],
        value: "Default Sydney label",
        prefillSource: "default",
        isSuggestSuccess: true,
      }),
    ).toBe(false);
  });

  it("does not open candidates when no visible suggestions are available", () => {
    const suggestion = createSuggestion({
      id: "darwin",
      displayLabel: "Darwin, Northern Territory, Australia",
      name: "Darwin",
      regionName: "Northern Territory",
    });

    expect(
      shouldOpenPrefilledLocationDropdown({
        suggestions: [suggestion],
        visibleSuggestions: [],
        value: "Darwin, AU",
        prefillSource: "url",
        isSuggestSuccess: true,
      }),
    ).toBe(false);
  });
});
