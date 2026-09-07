import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SavedLocationChips } from "@/components/home/SavedLocationChips";
import { appTheme } from "@/config/mantineTheme";
import type { SavedLocation } from "@/domain/savedLocation";
import { tFromEn } from "@/i18n/enTestTranslate";

const fixtures = vi.hoisted(() => {
  const home: SavedLocation = {
    id: "saved-home",
    label: "Home",
    createdAt: 1,
    location: {
      id: "loc-perth",
      displayLabel: "Perth, Western Australia, Australia",
      name: "Perth",
      regionName: "Western Australia",
      countryName: "Australia",
      latitude: -31.9523,
      longitude: 115.8613,
    },
  };

  return {
    home,
    savedLocations: [home] as SavedLocation[],
    removeLocation: vi.fn(),
    selectLocation: vi.fn(),
  };
});

vi.mock("react-i18next", async () => {
  const { tFromEn: translate } = await import("@/i18n/enTestTranslate");

  return {
    useTranslation: () => ({
      t: translate,
    }),
  };
});

vi.mock("@/store/savedLocationsStore", () => ({
  useSavedLocationsStore: (
    selector: (state: {
      savedLocations: SavedLocation[];
      removeLocation: (id: string) => void;
    }) => unknown,
  ) =>
    selector({
      savedLocations: fixtures.savedLocations,
      removeLocation: fixtures.removeLocation,
    }),
}));

vi.mock("@/store/homeStore", () => ({
  useHomeStore: (
    selector: (state: {
      selectLocation: (location: unknown) => void;
    }) => unknown,
  ) =>
    selector({
      selectLocation: fixtures.selectLocation,
    }),
}));

function renderChips(isEditing: boolean): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <SavedLocationChips isEditing={isEditing} />
    </MantineProvider>,
  );
}

describe("SavedLocationChips", () => {
  it("renders nothing when there are no saved locations", () => {
    fixtures.savedLocations = [];
    const markup = renderChips(false);

    expect(markup).not.toContain("Home");
    expect(markup).not.toContain(
      tFromEn("home.savedLocations.apply", { label: "Home" }),
    );
  });

  it("renders apply chips without a delete control by default", () => {
    fixtures.savedLocations = [fixtures.home];
    const markup = renderChips(false);
    const applyLabel = tFromEn("home.savedLocations.apply", { label: "Home" });

    expect(markup).toContain("Home");
    expect(markup).toContain(applyLabel);
    expect(markup).not.toContain(
      tFromEn("home.savedLocations.remove", { label: "Home" }),
    );
    expect(markup).not.toMatch(
      new RegExp(`aria-label="${applyLabel}"[^>]*disabled`),
    );
  });

  it("disables apply chips and shows delete while editing", () => {
    fixtures.savedLocations = [fixtures.home];
    const markup = renderChips(true);
    const applyLabel = tFromEn("home.savedLocations.apply", { label: "Home" });

    expect(markup).toMatch(
      new RegExp(
        `disabled[^>]*aria-label="${applyLabel}"|aria-label="${applyLabel}"[^>]*disabled`,
      ),
    );
    expect(markup).toContain(
      tFromEn("home.savedLocations.remove", { label: "Home" }),
    );
  });
});
