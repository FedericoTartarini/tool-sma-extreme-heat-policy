import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WeatherTemperatureGroupCell } from "@/components/home/weather/WeatherTemperatureGroupCell";
import { WEATHER_TEMPERATURE_GROUPS } from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";

function translate(key: string, options?: Record<string, string>): string {
  if (key === "home.sections.forecast.weatherDetails.valueAtTime") {
    return `${options?.value} @ ${options?.time}`;
  }

  if (key === "home.sections.forecast.weatherDetails.labelValue") {
    return `${options?.label} | ${options?.value}`;
  }

  return key;
}

const i18nState = vi.hoisted(() => ({ resolvedLanguage: "en" }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: translate,
    i18n: i18nState,
  }),
}));

afterEach(() => {
  i18nState.resolvedLanguage = "en";
});

const MAX_TEMPERATURE_GROUP = WEATHER_TEMPERATURE_GROUPS.find(
  (group) => group.id === "maxTemperature",
)!;

describe("WeatherTemperatureGroupCell", () => {
  it("renders the peak time next to the maximum temperature", () => {
    const details: DayWeatherDetails = {
      maxTempC: 29.6,
      humidityAtMaxPct: 22,
      maxTempTimeLocal: "14:00",
    };

    const markup = renderToStaticMarkup(
      <MantineProvider>
        <WeatherTemperatureGroupCell
          group={MAX_TEMPERATURE_GROUP}
          details={details}
        />
      </MantineProvider>,
    );

    expect(markup).toContain("@ 2 pm");
    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.metrics.humidityAtMaxPct | ",
    );
  });

  it("renders the peak time in the selected language", () => {
    i18nState.resolvedLanguage = "zh-CN";
    const details: DayWeatherDetails = {
      maxTempC: 29.6,
      maxTempTimeLocal: "14:00",
    };

    const markup = renderToStaticMarkup(
      <MantineProvider>
        <WeatherTemperatureGroupCell
          group={MAX_TEMPERATURE_GROUP}
          details={details}
        />
      </MantineProvider>,
    );

    expect(markup).toContain("@ 14时");
  });

  it("does not render peak time without a maximum temperature", () => {
    const details: DayWeatherDetails = {
      maxTempC: Number.NaN,
      minTempC: 16.9,
      humidityAtMaxPct: 22,
      humidityAtMinPct: 49,
      avgWindSpeedMs: 2.8,
      maxTempTimeLocal: "14:00",
    };

    const markup = renderToStaticMarkup(
      <MantineProvider>
        <WeatherTemperatureGroupCell
          group={MAX_TEMPERATURE_GROUP}
          details={details}
        />
      </MantineProvider>,
    );

    expect(markup).not.toContain("@ 2 pm");
    expect(markup).toContain(
      "home.sections.forecast.weatherDetails.metrics.humidityAtMaxPct",
    );
  });

  it("returns null when only peak time is available for max temperature", () => {
    const details: DayWeatherDetails = {
      maxTempC: Number.NaN,
      minTempC: 16.9,
      humidityAtMaxPct: Number.NaN,
      humidityAtMinPct: 49,
      avgWindSpeedMs: 2.8,
      maxTempTimeLocal: "14:00",
    };

    const markup = renderToStaticMarkup(
      <MantineProvider>
        <WeatherTemperatureGroupCell
          group={MAX_TEMPERATURE_GROUP}
          details={details}
        />
      </MantineProvider>,
    );

    expect(markup).not.toContain(
      "home.sections.forecast.weatherDetails.metrics.maxTempC",
    );
    expect(markup).not.toContain("@ 2 pm");
  });
});
