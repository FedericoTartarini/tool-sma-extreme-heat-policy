import type { WeatherDetailsGroupId } from "@/domain/weatherDetailsRegistry";

export interface WeatherDetailsDesktopRowLayout {
  left: WeatherDetailsGroupId | null;
  right: readonly WeatherDetailsGroupId[];
  metricColumns: 1 | 2;
}

/**
 * Mobile row pairings applied when both groups are available and adjacent
 * in registry order.
 */
export const WEATHER_DETAILS_MOBILE_PAIRS: readonly (readonly [
  WeatherDetailsGroupId,
  WeatherDetailsGroupId,
])[] = [["uv", "wind"]];

/**
 * Desktop row placements for each registered weather-details group.
 */
export const WEATHER_DETAILS_DESKTOP_ROWS: readonly WeatherDetailsDesktopRowLayout[] =
  [
    { left: "temperatureHumidity", right: ["uv", "wind"], metricColumns: 1 },
    { left: "precipitation", right: ["daylight"], metricColumns: 2 },
  ];
