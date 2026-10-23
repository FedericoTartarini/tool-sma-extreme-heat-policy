import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CurrentLocationErrorEvent } from "@/hooks/useHomeCurrentLocation";
import { LocationFieldActionIcons } from "@/components/home/LocationFieldActionIcons";
import { appTheme } from "@/config/mantineTheme";
import { tFromEn } from "@/i18n/enTestTranslate";

const currentLocationFixture = vi.hoisted(() => ({
  isDetecting: false,
  error: {
    reason: "missing_token" as const,
    eventId: 1,
  } as CurrentLocationErrorEvent | null,
  requestCurrentLocation: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: (effect: () => void) => {
      effect();
    },
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

vi.mock("@/hooks/useHomeCurrentLocation", () => ({
  useHomeCurrentLocation: () => currentLocationFixture,
}));

function renderIcons(props: {
  canSaveCurrentLocation: boolean;
  hasSavedLocations: boolean;
  onCurrentLocationError?: Mock;
}): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <LocationFieldActionIcons
        canSaveCurrentLocation={props.canSaveCurrentLocation}
        hasSavedLocations={props.hasSavedLocations}
        onOpenSavedLocations={() => undefined}
        onCurrentLocationError={props.onCurrentLocationError}
      />
    </MantineProvider>,
  );
}

describe("LocationFieldActionIcons", () => {
  beforeEach(() => {
    currentLocationFixture.isDetecting = false;
    currentLocationFixture.error = null;
    currentLocationFixture.requestCurrentLocation.mockClear();
  });

  it("enables use-my-location when geolocation is idle", () => {
    const markup = renderIcons({
      canSaveCurrentLocation: true,
      hasSavedLocations: false,
    });
    const locateLabel = tFromEn("home.savedLocations.useMyLocationButton");

    expect(markup).toContain(locateLabel);
    expect(markup).not.toMatch(
      new RegExp(`aria-label="${locateLabel}"[^>]*disabled`),
    );
  });

  it("disables use-my-location while detection is in progress", () => {
    currentLocationFixture.isDetecting = true;

    const markup = renderIcons({
      canSaveCurrentLocation: true,
      hasSavedLocations: false,
    });
    const locateLabel = tFromEn("home.savedLocations.useMyLocationButton");

    expect(markup).toMatch(
      new RegExp(`aria-label="${locateLabel}"[^>]*disabled`),
    );
    expect(markup).toContain('aria-busy="true"');
  });

  it("disables the bookmark when there is nothing to save or switch to", () => {
    const markup = renderIcons({
      canSaveCurrentLocation: false,
      hasSavedLocations: false,
    });
    const openLabel = tFromEn("home.savedLocations.openSavedLocations");

    expect(markup).toContain(openLabel);
    expect(markup).toMatch(
      new RegExp(`aria-label="${openLabel}"[^>]*disabled`),
    );
  });

  it("keeps the bookmark enabled when saved locations exist without a selection", () => {
    const markup = renderIcons({
      canSaveCurrentLocation: false,
      hasSavedLocations: true,
    });
    const openLabel = tFromEn("home.savedLocations.openSavedLocations");

    expect(markup).toContain(openLabel);
    expect(markup).not.toMatch(
      new RegExp(`aria-label="${openLabel}"[^>]*disabled`),
    );
  });

  it("labels the bookmark as save when a location is selected", () => {
    const markup = renderIcons({
      canSaveCurrentLocation: true,
      hasSavedLocations: false,
    });
    const saveLabel = tFromEn("home.savedLocations.saveButton");

    expect(markup).toContain(saveLabel);
    expect(markup).not.toMatch(
      new RegExp(`aria-label="${saveLabel}"[^>]*disabled`),
    );
  });

  it("invokes the error callback for two consecutive errors with the same reason", () => {
    const onCurrentLocationError = vi.fn();

    currentLocationFixture.error = { reason: "missing_token", eventId: 1 };
    renderIcons({
      canSaveCurrentLocation: true,
      hasSavedLocations: false,
      onCurrentLocationError,
    });
    expect(onCurrentLocationError).toHaveBeenCalledWith("missing_token");
    expect(onCurrentLocationError).toHaveBeenCalledTimes(1);

    currentLocationFixture.error = { reason: "missing_token", eventId: 2 };
    renderIcons({
      canSaveCurrentLocation: true,
      hasSavedLocations: false,
      onCurrentLocationError,
    });
    expect(onCurrentLocationError).toHaveBeenCalledWith("missing_token");
    expect(onCurrentLocationError).toHaveBeenCalledTimes(2);
  });

  it("invokes the error callback for the location_not_resolved reason", () => {
    const onCurrentLocationError = vi.fn();

    currentLocationFixture.error = {
      reason: "location_not_resolved",
      eventId: 1,
    };
    renderIcons({
      canSaveCurrentLocation: true,
      hasSavedLocations: false,
      onCurrentLocationError,
    });

    expect(onCurrentLocationError).toHaveBeenCalledWith(
      "location_not_resolved",
    );
  });
});
