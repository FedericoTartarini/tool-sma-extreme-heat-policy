import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShowWeatherDetailsSwitch } from "@/components/home/weather/ShowWeatherDetailsSwitch";
import {
  DEFAULT_HOME_UI_PREFERENCES,
  useHomeUiStore,
} from "@/store/homeUiStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("ShowWeatherDetailsSwitch", () => {
  beforeEach(() => {
    useHomeUiStore.setState(DEFAULT_HOME_UI_PREFERENCES);
  });

  afterEach(() => {
    useHomeUiStore.setState(DEFAULT_HOME_UI_PREFERENCES);
  });

  it("uses a static label without an overriding aria-label", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <ShowWeatherDetailsSwitch />
      </MantineProvider>,
    );

    expect(markup).toContain("home.sections.forecast.weatherDetails.title");
    expect(markup).toContain('role="switch"');
    expect(markup).not.toContain("aria-label");
  });
});
