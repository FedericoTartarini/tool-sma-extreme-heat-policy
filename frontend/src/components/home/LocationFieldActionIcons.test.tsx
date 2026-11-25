// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocodeCoordinates } from "@/api/mapboxReverseGeocode";
import { LocationFieldActionIcons } from "@/components/home/LocationFieldActionIcons";
import { appTheme } from "@/config/mantineTheme";
import { tFromEn } from "@/i18n/enTestTranslate";
import { useHomeStore } from "@/store/homeStore";

vi.mock("@/api/mapboxReverseGeocode", () => ({
  reverseGeocodeCoordinates: vi.fn(),
}));
vi.mock("react-i18next", async () => {
  const { tFromEn: translate } = await import("@/i18n/enTestTranslate");
  return { useTranslation: () => ({ t: translate }) };
});

const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>();
const cleanup: Array<() => void> = [];

function mountIcons(canSaveCurrentLocation = true, hasSavedLocations = false) {
  const onCurrentLocationError = vi.fn();
  const onOpenSavedLocations = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <MantineProvider theme={appTheme} env="test">
        <LocationFieldActionIcons
          canSaveCurrentLocation={canSaveCurrentLocation}
          hasSavedLocations={hasSavedLocations}
          onOpenSavedLocations={onOpenSavedLocations}
          onCurrentLocationError={onCurrentLocationError}
        />
      </MantineProvider>,
    ),
  );
  cleanup.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  const buttons = container.querySelectorAll("button");
  return {
    locate: buttons[0]!,
    bookmark: buttons[1]!,
    onCurrentLocationError,
    onOpenSavedLocations,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "test-token");
  vi.stubGlobal("navigator", {
    language: "en",
    languages: ["en"],
    geolocation: { getCurrentPosition },
  });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  useHomeStore.setState(useHomeStore.getInitialState());
});
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("LocationFieldActionIcons", () => {
  it("starts detection only on click and disables the button while waiting", () => {
    const view = mountIcons();
    expect(view.locate.getAttribute("aria-label")).toBe(
      tFromEn("home.savedLocations.useMyLocationButton"),
    );
    expect(view.locate.disabled).toBe(false);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    act(() => view.locate.click());
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(view.locate.disabled).toBe(true);
    expect(view.locate.getAttribute("aria-busy")).toBe("true");
  });

  it.each(["missing_token", "geolocation_unavailable"])(
    "reports %s on each actual click",
    (reason) => {
      if (reason === "missing_token")
        vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
      else vi.stubGlobal("navigator", { language: "en", languages: ["en"] });
      const view = mountIcons();
      act(() => view.locate.click());
      expect(view.onCurrentLocationError).toHaveBeenCalledExactlyOnceWith(
        reason,
      );
      act(() => view.locate.click());
      expect(view.onCurrentLocationError).toHaveBeenCalledTimes(2);
      expect(view.onCurrentLocationError).toHaveBeenLastCalledWith(reason);
      expect(view.locate.disabled).toBe(false);
    },
  );

  it("reports a permission timeout, re-enables the button and permits a second click", () => {
    const view = mountIcons();
    act(() => view.locate.click());
    act(() => vi.advanceTimersByTime(15_000));
    expect(view.onCurrentLocationError).toHaveBeenCalledExactlyOnceWith(
      "geolocation_timeout",
    );
    expect(view.locate.disabled).toBe(false);
    act(() => view.locate.click());
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(view.locate.disabled).toBe(true);
  });

  it("reports when a real detection flow finds no place", async () => {
    vi.mocked(reverseGeocodeCoordinates).mockResolvedValue([]);
    const view = mountIcons();
    act(() => view.locate.click());
    await act(async () =>
      getCurrentPosition.mock.calls[0]![0]({
        coords: { latitude: -33.89, longitude: 151.2 },
      } as GeolocationPosition),
    );
    expect(view.onCurrentLocationError).toHaveBeenCalledExactlyOnceWith(
      "location_not_resolved",
    );
    expect(view.locate.disabled).toBe(false);
  });

  it("disables the bookmark when there is nothing to save or switch to", () => {
    const view = mountIcons(false, false);
    expect(view.bookmark.disabled).toBe(true);
    expect(view.bookmark.getAttribute("aria-label")).toBe(
      tFromEn("home.savedLocations.openSavedLocations"),
    );
  });

  it("opens saved locations without a current selection", () => {
    const view = mountIcons(false, true);
    expect(view.bookmark.disabled).toBe(false);
    act(() => view.bookmark.click());
    expect(view.onOpenSavedLocations).toHaveBeenCalledOnce();
  });

  it("labels the bookmark as save when a location is selected", () => {
    const view = mountIcons(true, false);
    expect(view.bookmark.disabled).toBe(false);
    expect(view.bookmark.getAttribute("aria-label")).toBe(
      tFromEn("home.savedLocations.saveButton"),
    );
  });
});
