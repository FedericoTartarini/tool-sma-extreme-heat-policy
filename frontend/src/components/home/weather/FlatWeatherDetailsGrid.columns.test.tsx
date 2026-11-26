import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FlatWeatherDetailsGrid } from "@/components/home/weather/FlatWeatherDetailsGrid";
import { WEATHER_DETAILS_DESKTOP_ROWS } from "@/config/weatherDetailsGridConfig";
import type { WeatherDetailsGroupDefinition } from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("@/components/home/weather/WeatherDetailsCategorySection", () => ({
  WeatherDetailsCategorySection: ({
    group,
    metricColumns,
  }: {
    group: WeatherDetailsGroupDefinition;
    metricColumns: number;
  }) => <div data-group={group.id} data-columns={metricColumns} />,
}));

const ALL_GROUPS_DETAILS: DayWeatherDetails = {
  maxTempC: 29.6,
  minTempC: 16.9,
  humidityAtMaxPct: 22,
  humidityAtMinPct: 49,
  avgWindSpeedMs: 2.8,
  maxTempTimeLocal: "14:00",
  minTempTimeLocal: "08:00",
  uvIndexMax: 7.4,
  uvIndexMaxTimeLocal: "13:00",
  cumulativeRainfallMm: 3.2,
  precipProbMaxPct: 55,
  sunriseLocal: "06:30",
  sunsetLocal: "19:45",
};

describe("FlatWeatherDetailsGrid desktop columns", () => {
  it("renders every group with its desktop row's configured column count", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <FlatWeatherDetailsGrid details={ALL_GROUPS_DETAILS} isMobile={false} />
      </MantineProvider>,
    );
    const renderedColumns = Object.fromEntries(
      [...markup.matchAll(/data-group="([^"]+)" data-columns="(\d+)"/g)].map(
        (match) => [match[1], Number(match[2])],
      ),
    );
    const configuredColumns = Object.fromEntries(
      WEATHER_DETAILS_DESKTOP_ROWS.flatMap((row) =>
        [...(row.left ? [row.left] : []), ...row.right].map((groupId) => [
          groupId,
          row.metricColumns,
        ]),
      ),
    );

    expect(renderedColumns).toEqual(configuredColumns);
  });
});
