import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ForecastSection } from "@/components/home/ForecastSection";
import { appTheme } from "@/config/mantineTheme";
import type { ForecastDay } from "@/domain/risk";
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

// 08:00 on the 22nd in Sydney is still the 21st in UTC, so the second day is
// named differently depending on which zone the forecast is read in.
const FORECAST_A11Y: ForecastDay[] = [
  {
    date: "2026-09-21T11:00:00+10:00",
    risk: "low",
    points: [
      { time: "11:00", value: 1 },
      { time: "12:00", value: 2 },
    ],
  },
  {
    date: "2026-09-22T08:00:00+10:00",
    risk: "moderate",
    points: [
      { time: "08:00", value: 2 },
      { time: "09:00", value: 3 },
    ],
  },
];

const FORECAST_WEATHER: ForecastDayWithWeatherDetails[] = [
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

const fixtures = vi.hoisted(() => ({
  timeZone: "Australia/Sydney",
  useWeatherForecast: false,
}));

const weatherDetailsPreference = vi.hoisted(() => ({
  show: false,
}));

vi.mock("react-i18next", async () => {
  const { tFromEn: translate } = await import("@/i18n/enTestTranslate");

  return {
    useTranslation: () => ({
      t: translate,
      i18n: { resolvedLanguage: "en" },
    }),
  };
});

vi.mock("@/hooks/useIsMobileViewport", () => ({
  useIsMobileViewport: () => false,
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
      showWeatherDetails: weatherDetailsPreference.show,
      setShowWeatherDetails: () => undefined,
    }),
}));

vi.mock("@/hooks/useHomeHeatRisk", () => ({
  useHomeHeatRisk: () => ({
    hasCalculatedRisk: true,
    forecast: fixtures.useWeatherForecast ? FORECAST_WEATHER : FORECAST_A11Y,
    meta: { timeZone: fixtures.timeZone },
  }),
}));

vi.mock("@/components/ui/EChart", () => ({
  EChart: () => null,
}));

function renderForecastMarkup(): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <ForecastSection />
    </MantineProvider>,
  );
}

function renderChartLabels(timeZone: string): string[] {
  fixtures.useWeatherForecast = false;
  weatherDetailsPreference.show = false;
  fixtures.timeZone = timeZone;

  const markup = renderForecastMarkup();

  return [...markup.matchAll(/aria-label="([^"]*)"/g)]
    .map((match) => match[1])
    .filter((label) => label.startsWith("Heat risk forecast for"));
}

describe("ForecastSection", () => {
  it("names every chart after its own day", () => {
    // These names are the only way a screen reader user tells the charts apart.
    const labels = renderChartLabels("Australia/Sydney");

    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain("Monday 21 Sept");
    expect(labels[0]).not.toContain("22 Sept");
    expect(labels[1]).toContain("Tuesday 22 Sept");
    expect(labels[1]).not.toContain("21 Sept");
  });

  it("reads those days in the forecast's time zone, not the machine's", () => {
    // Comparing two zones keeps this honest wherever the suite runs: if the
    // time zone were ignored, both renders would produce the same name.
    const sydney = renderChartLabels("Australia/Sydney");
    const utc = renderChartLabels("UTC");

    expect(sydney[1]).toContain("Tuesday 22 Sept");
    expect(utc[1]).toContain("Monday 21 Sept");
  });

  it("captions each hourly table with the same day as its chart", () => {
    fixtures.timeZone = "Australia/Sydney";
    weatherDetailsPreference.show = false;
    fixtures.useWeatherForecast = false;

    const captions = [
      ...renderForecastMarkup().matchAll(/<caption[^>]*>([^<]*)</g),
    ]
      .map((match) => match[1])
      .filter((caption) => caption.startsWith("Hourly heat risk for"));

    expect(captions).toEqual([
      "Hourly heat risk for Monday 21 Sept",
      "Hourly heat risk for Tuesday 22 Sept",
    ]);
  });

  it("renders weather values for days with details and unavailable for days without", () => {
    fixtures.useWeatherForecast = true;
    weatherDetailsPreference.show = true;
    const markup = renderForecastMarkup();

    expect(markup).toContain("31.0°C");
    expect(markup).toContain("27.5°C");
    expect(
      markup.split("Weather details unavailable for this day").length - 1,
    ).toBe(1);
    expect(markup.split("(Full calendar day)").length - 1).toBe(1);
  });

  it("hides weather details when the toggle is off", () => {
    fixtures.useWeatherForecast = true;
    weatherDetailsPreference.show = false;
    const markup = renderForecastMarkup();

    expect(markup).toContain("Forecasted risk");
    expect(markup).toContain("Weather details");
    expect(markup).not.toContain("31.0°C");
    expect(markup).not.toContain("Weather details unavailable for this day");
    expect(markup).not.toContain("(Full calendar day)");
  });
});
