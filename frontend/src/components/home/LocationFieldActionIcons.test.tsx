import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LocationFieldActionIcons } from "@/components/home/LocationFieldActionIcons";
import { appTheme } from "@/config/mantineTheme";
import { tFromEn } from "@/i18n/enTestTranslate";

vi.mock("react-i18next", async () => {
  const { tFromEn: translate } = await import("@/i18n/enTestTranslate");

  return {
    useTranslation: () => ({
      t: translate,
    }),
  };
});

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
  it("keeps use-my-location disabled until geolocation is wired", () => {
    const markup = renderIcons({
      canSaveCurrentLocation: true,
      hasSavedLocations: false,
    });
    const locateLabel = tFromEn("home.savedLocations.useMyLocationButton");

    expect(markup).toContain(locateLabel);
    expect(markup).toMatch(
      new RegExp(`aria-label="${locateLabel}"[^>]*disabled`),
    );
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
