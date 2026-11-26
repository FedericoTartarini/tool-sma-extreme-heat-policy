import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { getWeatherMetricDefinition } from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";
import enTranslations from "@/i18n/locales/en/translation.json";
import zhTranslations from "@/i18n/locales/zh-CN/translation.json";
import {
  formatWeatherMetricValue,
  formatWeatherValueAtTime,
} from "@/lib/formatWeatherDetails";

function createTranslate(translations: object): TFunction {
  function translate(key: string, options?: Record<string, string>): string {
    const template = key
      .split(".")
      .reduce<unknown>(
        (value, segment) =>
          value !== null && typeof value === "object" && segment in value
            ? (value as Record<string, unknown>)[segment]
            : undefined,
        translations,
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

  return translate as TFunction;
}

const t = createTranslate(enTranslations);
const tZh = createTranslate(zhTranslations);
const LOCALE = "en-AU";

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
        LOCALE,
      ),
    ).toBe("16.9°C");
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("humidityAtMaxPct"),
        t,
        LOCALE,
      ),
    ).toBe("22%");
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("avgWindSpeedMs"),
        t,
        LOCALE,
      ),
    ).toBe("2.8 m/s");
  });

  it("shows a value that rounds to zero without a minus sign", () => {
    expect(
      formatWeatherMetricValue(
        { ...BASE_DETAILS, minTempC: -0.04 },
        getWeatherMetricDefinition("minTempC"),
        t,
        LOCALE,
      ),
    ).toBe("0.0°C");
  });

  it("returns unavailable when the metric value is missing", () => {
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("uvIndexMax"),
        t,
        LOCALE,
      ),
    ).toBe("—");
  });

  it("appends the registry time field for temperature extremes", () => {
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("maxTempC"),
        t,
        LOCALE,
      ),
    ).toBe("29.6°C @ 2 pm");
  });

  it("formats the time of day in the selected language", () => {
    expect(
      formatWeatherMetricValue(
        BASE_DETAILS,
        getWeatherMetricDefinition("maxTempC"),
        tZh,
        "zh-CN",
      ),
    ).toBe("29.6°C @ 14时");
  });

  it("formats UV with the time of day maximum", () => {
    expect(
      formatWeatherMetricValue(
        { ...BASE_DETAILS, uvIndexMax: 8.5, uvIndexMaxTimeLocal: "13:00" },
        getWeatherMetricDefinition("uvIndexMax"),
        t,
        LOCALE,
      ),
    ).toBe("8.5 @ 1 pm");
  });

  it("formats unitless numeric values without a time", () => {
    expect(
      formatWeatherMetricValue(
        { ...BASE_DETAILS, uvIndexMax: 7.4 },
        getWeatherMetricDefinition("uvIndexMax"),
        t,
        LOCALE,
      ),
    ).toBe("7.4");
  });

  it("appends a local time when one is provided", () => {
    expect(formatWeatherValueAtTime("29.6°C", "14:00", t, LOCALE)).toBe(
      "29.6°C @ 2 pm",
    );
  });

  it("returns the value unchanged when time is missing", () => {
    expect(formatWeatherValueAtTime("29.6°C", null, t, LOCALE)).toBe("29.6°C");
  });
});
