import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ForecastSection } from "@/components/home/ForecastSection";
import type { DayWeatherDetails } from "@/domain/weatherSummary";
import type { ForecastDayWithWeatherDetails } from "@/lib/homeRisk";
import type { HomeUiPreferences } from "@/store/homeUiStore";

const TODAY_WEATHER: DayWeatherDetails = {
  maxTempC: 31,
  minTempC: 18,
  humidityAtMaxPct: 22,
  humidityAtMinPct: 49,
  avgWindSpeedMs: 2.8,
  maxTempTimeLocal: "14:00",
  minTempTimeLocal: "08:00",
  uvIndexMax: 8.2,
  uvIndexMaxTimeLocal: "13:00",
  precipProbMaxPct: 55,
  cumulativeRainfallMm: 3.2,
  sunriseLocal: "06:30",
  sunsetLocal: "19:45",
};

const TOMORROW_WEATHER: DayWeatherDetails = {
  maxTempC: 27.5,
  minTempC: 16,
};

const FORECAST_DAYS: ForecastDayWithWeatherDetails[] = [
  {
    date: "2026-03-09T11:00:00+11:00",
    risk: "moderate",
    points: [{ time: "11:00", value: 1.2 }],
    weatherDetails: TODAY_WEATHER,
  },
  {
    date: "2026-03-10T00:00:00+11:00",
    risk: "high",
    points: [{ time: "00:00", value: 2.4 }],
    weatherDetails: TOMORROW_WEATHER,
  },
  {
    date: "2026-03-11T00:00:00+11:00",
    risk: "low",
    points: [{ time: "00:00", value: 0.8 }],
    weatherDetails: null,
  },
];

function translate(key: string, options?: Record<string, string>): string {
  if (options?.value) {
    return `${key}:${options.value}`;
  }

  return key;
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: translate,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("@/store/homeUiStore", () => ({
  useHomeUiStore: (
    selector: (
      state: HomeUiPreferences & {
        setShowWeatherDetails: (showWeatherDetails: boolean) => void;
      },
    ) => unknown,
  ) =>
    selector({
      showWeatherDetails: true,
      setShowWeatherDetails: () => undefined,
    }),
}));

vi.mock("@/hooks/useHomeHeatRisk", () => ({
  useHomeHeatRisk: () => ({
    hasCalculatedRisk: true,
    forecast: FORECAST_DAYS,
    meta: { timeZone: "Australia/Sydney" },
  }),
}));

describe("ForecastSection", () => {
  it("renders weather values for days with details and unavailable for days without", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <ForecastSection />
      </MantineProvider>,
    );

    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.units.celsius:31.0",
    );
    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.units.celsius:27.5",
    );
    expect(
      markup.split("home.sections.forecast.weatherDetails.unavailableForDay")
        .length - 1,
    ).toBe(1);
    expect(
      markup.split("home.sections.forecast.weatherDetails.fullCalendarDayNote")
        .length - 1,
    ).toBe(1);
  });
});
