import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ForecastSection } from "@/components/home/ForecastSection";
import type { DayWeatherDetails } from "@/domain/weatherSummary";

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
    selector: (state: {
      showWeatherDetails: boolean;
      setShowWeatherDetails: (showWeatherDetails: boolean) => void;
    }) => unknown,
  ) =>
    selector({
      showWeatherDetails: true,
      setShowWeatherDetails: () => undefined,
    }),
}));

vi.mock("@/hooks/useHomeHeatRisk", () => ({
  useHomeHeatRisk: () => ({
    hasCalculatedRisk: true,
    forecast: [
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
    ],
    meta: { timeZone: "Australia/Sydney" },
  }),
}));

describe("ForecastSection", () => {
  it("passes mapped weather details into each day's panel", () => {
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
  });
});
