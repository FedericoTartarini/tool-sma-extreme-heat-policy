import { describe, expect, it } from "vitest";
import {
  listAvailableWeatherGroups,
  listAvailableWeatherTemperatureGroups,
  WEATHER_TEMPERATURE_GROUPS,
} from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";

const BASE_DETAILS: DayWeatherDetails = {
  maxTempC: 29.6,
  minTempC: 16.9,
  humidityAtMaxPct: 22,
  humidityAtMinPct: 49,
  avgWindSpeedMs: 2.8,
  maxTempTimeLocal: "14:00",
  minTempTimeLocal: "08:00",
};

describe("listAvailableWeatherGroups", () => {
  it("hides optional groups when their metrics are unavailable", () => {
    expect(
      listAvailableWeatherGroups(BASE_DETAILS).map((group) => group.id),
    ).toEqual(["temperatureHumidity", "wind"]);
  });

  it("includes uv, precipitation and daylight groups when optional metrics exist", () => {
    expect(
      listAvailableWeatherGroups({
        ...BASE_DETAILS,
        uvIndexMax: 7.4,
        cumulativeRainfallMm: 0,
        precipProbMaxPct: 0,
        sunriseLocal: "07:13",
        sunsetLocal: "18:56",
      }).map((group) => group.id),
    ).toEqual([
      "temperatureHumidity",
      "uv",
      "wind",
      "precipitation",
      "daylight",
    ]);
  });
});

describe("listAvailableWeatherTemperatureGroups", () => {
  it("combines max temp with peak time and humidity at max", () => {
    expect(
      listAvailableWeatherTemperatureGroups(BASE_DETAILS).map((group) => ({
        id: group.id,
        primaryField: group.primaryField,
        detailFields: group.detailFields,
      })),
    ).toEqual([
      {
        id: "minTemperature",
        primaryField: "minTempC",
        detailFields: ["humidityAtMinPct"],
      },
      {
        id: "maxTemperature",
        primaryField: "maxTempC",
        detailFields: ["humidityAtMaxPct"],
      },
    ]);
  });

  it("keeps temperature group definitions stable", () => {
    expect(WEATHER_TEMPERATURE_GROUPS).toEqual([
      {
        id: "minTemperature",
        primaryField: "minTempC",
        detailFields: ["humidityAtMinPct"],
      },
      {
        id: "maxTemperature",
        primaryField: "maxTempC",
        detailFields: ["humidityAtMaxPct"],
      },
    ]);
  });
});
