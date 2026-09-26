import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocationFieldActionIcons } from "@/components/home/LocationFieldActionIcons";
import { appTheme } from "@/config/mantineTheme";
import { tFromEn } from "@/i18n/enTestTranslate";

const currentLocationFixture = vi.hoisted(() => ({
  isDetecting: false,
  errorReason: null,
  requestCurrentLocation: vi.fn(),
}));

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
}): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <LocationFieldActionIcons
        canSaveCurrentLocation={props.canSaveCurrentLocation}
        hasSavedLocations={props.hasSavedLocations}
        onOpenSavedLocations={() => undefined}
      />
    </MantineProvider>,
  );
}

describe("LocationFieldActionIcons", () => {
  beforeEach(() => {
    currentLocationFixture.isDetecting = false;
    currentLocationFixture.errorReason = null;
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
});
