import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveLocationModal } from "@/components/home/SaveLocationModal";
import { appTheme } from "@/config/mantineTheme";
import type { LocationSuggestion } from "@/domain/location";
import {
  SAVED_LOCATIONS_MAX,
  type SavedLocation,
  type SaveLocationRejectReason,
} from "@/domain/savedLocation";
import { tFromEn } from "@/i18n/enTestTranslate";
import enTranslation from "@/i18n/locales/en/translation.json";

const fixtures = vi.hoisted(() => {
  const perth: LocationSuggestion = {
    id: "loc-perth",
    displayLabel: "Perth, Western Australia, Australia",
    name: "Perth",
    regionName: "Western Australia",
    countryName: "Australia",
    latitude: -31.9523,
    longitude: 115.8613,
  };

  const home: SavedLocation = {
    id: "saved-home",
    label: "Home",
    createdAt: 1,
    location: perth,
  };

  return {
    perth,
    selectedLocation: perth as LocationSuggestion | null,
    savedLocations: [home] as SavedLocation[],
    saveLocation: vi.fn(),
    removeLocation: vi.fn(),
    selectLocation: vi.fn(),
  };
});

vi.mock("@mantine/core", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("@mantine/core")>();

  return {
    ...actual,
    Modal: ({
      children,
      title,
    }: {
      children: React.ReactNode;
      title: React.ReactNode;
    }) => React.createElement("div", null, title, children),
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

vi.mock("@/store/homeStore", () => ({
  useHomeStore: (
    selector: (state: {
      selectedLocation: LocationSuggestion | null;
      selectLocation: (location: LocationSuggestion) => void;
    }) => unknown,
  ) =>
    selector({
      selectedLocation: fixtures.selectedLocation,
      selectLocation: fixtures.selectLocation,
    }),
}));

vi.mock("@/store/savedLocationsStore", () => ({
  useSavedLocationsStore: (
    selector: (state: {
      savedLocations: SavedLocation[];
      saveLocation: () => { status: "saved"; id: string };
      removeLocation: (id: string) => void;
    }) => unknown,
  ) =>
    selector({
      savedLocations: fixtures.savedLocations,
      saveLocation: fixtures.saveLocation,
      removeLocation: fixtures.removeLocation,
    }),
}));

const REJECT_REASONS: SaveLocationRejectReason[] = [
  "empty_label",
  "duplicate_label",
  "limit_reached",
  "missing_coordinates",
  "storage_unavailable",
];

function renderModal(): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <SaveLocationModal opened onClose={() => undefined} />
    </MantineProvider>,
  );
}

describe("SaveLocationModal", () => {
  it("shows the location being saved and the name field", () => {
    fixtures.selectedLocation = fixtures.perth;
    const markup = renderModal();

    expect(markup).toContain(tFromEn("home.savedLocations.modalTitle"));
    expect(markup).toContain(
      tFromEn("home.savedLocations.savingLocationIntro", {
        location: fixtures.perth.displayLabel,
      }),
    );
    expect(markup).toContain(tFromEn("home.savedLocations.labelInput"));
    expect(markup).toContain(tFromEn("home.savedLocations.confirm"));
    expect(markup).toContain(tFromEn("home.savedLocations.edit"));
  });

  it("opens as a switch-only list when no location is selected", () => {
    fixtures.selectedLocation = null;
    const markup = renderModal();

    expect(markup).toContain(tFromEn("home.savedLocations.savedListTitle"));
    expect(markup).toContain("Home");
    expect(markup).not.toContain(
      tFromEn("home.savedLocations.savingLocationIntro", {
        location: fixtures.perth.displayLabel,
      }),
    );
    expect(markup).not.toContain(tFromEn("home.savedLocations.labelInput"));
  });

  it("maps every reject reason through locale copy with interpolation placeholders", () => {
    expect(
      Object.keys(enTranslation.home.savedLocations.errors).sort(),
    ).toEqual([...REJECT_REASONS].sort());

    for (const reason of REJECT_REASONS) {
      const message = tFromEn(`home.savedLocations.errors.${reason}`, {
        max: SAVED_LOCATIONS_MAX,
      });

      expect(message.trim().length).toBeGreaterThan(0);
      expect(message).not.toMatch(/\{\{/);
    }

    expect(
      tFromEn("home.savedLocations.errors.limit_reached", {
        max: SAVED_LOCATIONS_MAX,
      }),
    ).toContain(String(SAVED_LOCATIONS_MAX));
  });
});
