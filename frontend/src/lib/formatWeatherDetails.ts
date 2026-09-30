import type { TFunction } from "i18next";
import type { WeatherDetailsMetricDefinition } from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";
import {
  getWeatherMetricValue,
  isWeatherMetricAvailable,
} from "@/domain/weatherDetailsRegistry";

function formatNumericValue(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/**
 * Formats a metric value with an optional local time of day.
 */
export function formatWeatherValueAtTime(
  value: string,
  time: string | null | undefined,
  t: TFunction,
): string {
  if (time === null || time === undefined || time.trim().length === 0) {
    return value;
  }

  return t("home.sections.forecast.weatherDetails.valueAtTime", {
    value,
    time,
  });
}

/**
 * Formats one weather metric for display using i18n unit labels.
 */
export function formatWeatherMetricValue(
  details: DayWeatherDetails,
  metric: WeatherDetailsMetricDefinition,
  t: TFunction,
): string {
  const rawValue = getWeatherMetricValue(details, metric.field);

  if (rawValue === null || rawValue === undefined) {
    return t("home.sections.forecast.weatherDetails.unavailable");
  }

  if (typeof rawValue === "string") {
    return rawValue;
  }

  if (!Number.isFinite(rawValue)) {
    return t("home.sections.forecast.weatherDetails.unavailable");
  }

  const formattedNumber = formatNumericValue(
    rawValue,
    metric.decimals ?? (metric.unitKey === "percent" ? 0 : 1),
  );

  const formattedValue = !metric.unitKey
    ? formattedNumber
    : t(`home.sections.forecast.weatherDetails.units.${metric.unitKey}`, {
        value: formattedNumber,
      });

  if (metric.timeField && isWeatherMetricAvailable(details, metric.timeField)) {
    const time = getWeatherMetricValue(details, metric.timeField);

    return formatWeatherValueAtTime(
      formattedValue,
      typeof time === "string" ? time : null,
      t,
    );
  }

  return formattedValue;
}
