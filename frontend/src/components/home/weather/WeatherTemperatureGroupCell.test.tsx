import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WeatherTemperatureGroupCell } from "@/components/home/weather/WeatherTemperatureGroupCell";
import { WEATHER_TEMPERATURE_GROUPS } from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";

function translate(key: string, options?: Record<string, string>): string {
  if (key === "home.sections.forecast.weatherDetails.valueAtTime") {
    return `${options?.value} @ ${options?.time}`;
  }

  return key;
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: translate }),
}));

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

    expect(markup).toContain("@ 14:00");
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

    expect(markup).not.toContain("@ 14:00");
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
    expect(markup).not.toContain("@ 14:00");
  });
});
