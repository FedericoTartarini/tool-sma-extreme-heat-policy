import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FiltersSection } from "@/components/home/FiltersSection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key === "home.sections.filters.sportImageAlt"
        ? `Selected sport: ${options?.sportLabel}`
        : key,
  }),
}));

vi.mock("@/hooks/useHomeLocationSuggest", () => ({
  useHomeLocationSuggest: () => ({
    locationSearchInput: "",
    locationSuggestions: [],
    isSuggestLoading: false,
    shouldOpenLocationDropdown: false,
    suggestErrorReason: null,
    onLocationSearchInputChange: vi.fn(),
    onLocationOptionSubmit: vi.fn(),
  }),
}));

vi.mock("@/store/homeStore", () => ({
  useHomeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      sport: "BASKETBALL",
      selectedLocation: null,
      setSport: vi.fn(),
    }),
}));

describe("FiltersSection", () => {
  it("renders the selected sport with responsive image sources and alt text", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <FiltersSection />
      </MantineProvider>,
    );

    expect(markup).toContain('src="/sports/basketball-816.webp"');
    expect(markup).toContain(
      "/sports/basketball-320.webp 320w, /sports/basketball-640.webp 640w, /sports/basketball-816.webp 816w",
    );
    expect(markup).toContain(
      'sizes="(max-width: 48em) calc(100vw - 4rem), 48rem"',
    );
    expect(markup).toContain('alt="Selected sport: sports.basketball"');
  });
});
