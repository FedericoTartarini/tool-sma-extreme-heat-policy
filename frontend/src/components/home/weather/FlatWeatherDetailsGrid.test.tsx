import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FlatWeatherDetailsGrid } from "@/components/home/weather/FlatWeatherDetailsGrid";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const DETAILS = {
  maxTempC: 29.6,
  minTempC: 16.9,
  humidityAtMaxPct: 22,
  humidityAtMinPct: 49,
  avgWindSpeedMs: 2.8,
  maxTempTimeLocal: "14:00",
  minTempTimeLocal: "08:00",
  uvIndexMax: 7.4,
};

describe("FlatWeatherDetailsGrid", () => {
  it("keeps UV and wind as two mobile columns in one row", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid details={DETAILS} isMobile />
      </MantineProvider>,
    );

    const uvIndex = markup.indexOf(
      "home.sections.forecast.weatherDetails.groups.uv",
    );
    const windIndex = markup.indexOf(
      "home.sections.forecast.weatherDetails.groups.wind",
    );

    expect(uvIndex).toBeGreaterThan(-1);
    expect(windIndex).toBeGreaterThan(uvIndex);
  });

  it("renders a single desktop column without a divider when only one half is present", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid
          details={{
            maxTempC: 29.6,
            minTempC: 16.9,
            humidityAtMaxPct: 22,
            humidityAtMinPct: 49,
            avgWindSpeedMs: Number.NaN,
            maxTempTimeLocal: "14:00",
            minTempTimeLocal: "08:00",
          }}
          isMobile={false}
        />
      </MantineProvider>,
    );

    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.groups.temperatureHumidity",
    );
    expect(markup).not.toContain(
      "home.sections.forecast.weatherDetails.groups.wind",
    );
    expect(markup).not.toContain("mantine-Divider-root");
  });

  it("renders precipitation and daylight on the second desktop row", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid
          details={{
            ...DETAILS,
            precipProbMaxPct: 55,
            cumulativeRainfallMm: 3.2,
            sunriseLocal: "06:30",
            sunsetLocal: "19:45",
          }}
          isMobile={false}
        />
      </MantineProvider>,
    );

    const precipitationIndex = markup.indexOf(
      "home.sections.forecast.weatherDetails.groups.precipitation",
    );
    const daylightIndex = markup.indexOf(
      "home.sections.forecast.weatherDetails.groups.daylight",
    );

    expect(precipitationIndex).toBeGreaterThan(-1);
    expect(daylightIndex).toBeGreaterThan(precipitationIndex);
    expect(markup).toContain("6:30 AM");
    expect(markup).toContain("7:45 PM");
  });

  it("renders a desktop divider between temperature and UV/wind halves", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid details={DETAILS} isMobile={false} />
      </MantineProvider>,
    );

    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.groups.temperatureHumidity",
    );
    expect(markup).toContain("home.sections.forecast.weatherDetails.groups.uv");
    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.groups.wind",
    );
    expect(markup).toContain("mantine-Divider-root");
  });

  it("shows the full-calendar-day note only when requested", () => {
    const withoutNote = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid details={DETAILS} isMobile />
      </MantineProvider>,
    );
    const withNote = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid
          details={DETAILS}
          isMobile
          showFullCalendarDayNote
        />
      </MantineProvider>,
    );

    expect(withoutNote).not.toContain(
      "home.sections.forecast.weatherDetails.fullCalendarDayNote",
    );
    expect(withNote).toContain(
      "home.sections.forecast.weatherDetails.fullCalendarDayNote",
    );
  });

  it("renders an empty state when daily weather details are missing", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid details={null} isMobile />
      </MantineProvider>,
    );

    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.unavailableForDay",
    );
    expect(markup).not.toContain(
      "home.sections.forecast.weatherDetails.groups.temperatureHumidity",
    );
  });
});
