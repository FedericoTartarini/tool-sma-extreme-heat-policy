import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { getWeatherMetricDefinition } from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";
import enTranslations from "@/i18n/locales/en/translation.json";
import {
  formatWeatherMetricValue,
  formatWeatherValueAtTime,
} from "@/lib/formatWeatherDetails";

function translate(key: string, options?: Record<string, string>): string {
  const template = key
    .split(".")
    .reduce<unknown>(
      (value, segment) =>
        value !== null && typeof value === "object" && segment in value
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      enTranslations,
    );

  if (typeof template !== "string") {
    throw new Error(`Missing translation for ${key}`);
  }

  if (!options) {
    return template;
  }

  return Object.entries(options).reduce(
    (result, [placeholder, replacement]) =>
      result.replace(`{{${placeholder}}}`, replacement),
    template,
  );
}

const t = translate as TFunction;

const BASE_DETAILS: DayWeatherDetails = {
  maxTempC: 29.6,
  minTempC: 16.9,
  humidityAtMaxPct: 22,
  humidityAtMinPct: 49,
  avgWindSpeedMs: 2.8,
  maxTempTimeLocal: "14:00",
};

describe("formatWeatherMetricValue", () => {
  it("formats numeric values with unit templates", () => {
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("minTempC"),
        t,
      ),
    ).toBe("16.9°C");
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("humidityAtMaxPct"),
        t,
      ),
    ).toBe("22%");
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("avgWindSpeedMs"),
        t,
      ),
    ).toBe("2.8 m/s");
  });

  it("returns unavailable when the metric value is missing", () => {
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("uvIndexMax"),
        t,
      ),
    ).toBe("—");
  });

  it("appends the registry time field for temperature extremes", () => {
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("maxTempC"),
        t,
      ),
    ).toBe("29.6°C @ 14:00");
  });

  it("formats UV with the time of day maximum", () => {
    expect(
      formatWeatherMetricValue(
        { ...BASE_DETAILS, uvIndexMax: 8.5, uvIndexMaxTimeLocal: "13:00" },
        getWeatherMetricDefinition("uvIndexMax"),
        t,
      ),
    ).toBe("8.5 @ 13:00");
  });

  it("formats unitless numeric values without a time", () => {
    expect(
      formatWeatherMetricValue(
        { ...BASE_DETAILS, uvIndexMax: 7.4 },
        getWeatherMetricDefinition("uvIndexMax"),
        t,
      ),
    ).toBe("7.4");
  });

  it("appends a local time when one is provided", () => {
    expect(formatWeatherValueAtTime("29.6°C", "14:00", t)).toBe(
      "29.6°C @ 14:00",
    );
  });

  it("returns the value unchanged when time is missing", () => {
    expect(formatWeatherValueAtTime("29.6°C", null, t)).toBe("29.6°C");
  });
});
