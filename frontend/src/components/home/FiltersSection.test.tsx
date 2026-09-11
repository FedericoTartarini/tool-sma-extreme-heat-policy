import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FiltersSection } from "@/components/home/FiltersSection";
import { appTheme } from "@/config/mantineTheme";
import type { LocationSuggestion } from "@/domain/location";
import type { SavedLocation } from "@/domain/savedLocation";

const fixtures = vi.hoisted(() => {
  const perth: LocationSuggestion = {
    id: "mbx-perth",
    mapboxId: "mbx-perth",
    displayLabel: "Perth, Western Australia, Australia",
    name: "Perth",
    regionName: "Western Australia",
    countryName: "Australia",
    latitude: -31.9523,
    longitude: 115.8613,
  };

  const sydney: LocationSuggestion = {
    id: "mbx-sydney",
    mapboxId: "mbx-sydney",
    displayLabel: "Sydney, New South Wales, Australia",
    name: "Sydney",
    regionName: "New South Wales",
    countryName: "Australia",
    latitude: -33.8688,
    longitude: 151.2093,
  };

  const home: SavedLocation = {
    id: "saved-home",
    label: "Home",
    createdAt: 1,
    location: perth,
  };

  return {
    perth,
    sydney,
    selectedLocation: null as LocationSuggestion | null,
    savedLocations: [home] as SavedLocation[],
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/useHomeLocationSuggest", () => ({
  useHomeLocationSuggest: () => ({
    locationSearchInput: "Per",
    locationSuggestions: [fixtures.perth, fixtures.sydney],
    isSuggestLoading: false,
    shouldOpenLocationDropdown: true,
    suggestErrorReason: null,
    onLocationSearchInputChange: () => undefined,
    onLocationOptionSubmit: () => undefined,
  }),
}));

vi.mock("@/store/homeStore", () => ({
  useHomeStore: (
    selector: (state: {
      sport: string;
      selectedLocation: LocationSuggestion | null;
      setSport: (sport: string) => void;
    }) => unknown,
  ) =>
    selector({
      sport: "SOCCER",
      selectedLocation: fixtures.selectedLocation,
      setSport: () => undefined,
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
      saveLocation: () => ({ status: "saved", id: "x" }),
      removeLocation: () => undefined,
    }),
}));

vi.mock("@mantine/core", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("@mantine/core")>();

  function Combobox({ children }: { children: React.ReactNode }) {
    return React.createElement("div", null, children);
  }

  Combobox.Target = ({ children }: { children: React.ReactNode }) => children;
  Combobox.Dropdown = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children);
  Combobox.Options = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children);
  Combobox.Option = ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => React.createElement("div", { "data-option": value }, children);
  Combobox.Chevron = () => React.createElement("span", null, "chevron");

  return {
    ...actual,
    Combobox,
    Modal: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
  };
});

function renderFilters(): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <FiltersSection />
    </MantineProvider>,
  );
}

describe("FiltersSection", () => {
  it("announces saved and unsaved bookmark state in the dropdown", () => {
    fixtures.selectedLocation = fixtures.perth;
    const markup = renderFilters();

    expect(markup).toContain('role="img"');
    expect(markup).toContain("home.savedLocations.suggestionSaved");
    expect(markup).toContain("home.savedLocations.suggestionUnsaved");
    expect(markup).toContain("Perth, Western Australia, Australia");
    expect(markup).toContain("Sydney, New South Wales, Australia");
  });

  it("keeps the bookmark available when no location is selected", () => {
    fixtures.selectedLocation = null;
    const markup = renderFilters();

    expect(markup).toContain("home.savedLocations.openSavedLocations");
    expect(markup).not.toMatch(
      /aria-label="home.savedLocations.openSavedLocations"[^>]*disabled/,
    );
  });
});
