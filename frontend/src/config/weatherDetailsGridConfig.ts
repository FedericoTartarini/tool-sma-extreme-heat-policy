import type { WeatherDetailsGroupId } from "@/domain/weatherDetailsRegistry";

export interface WeatherDetailsDesktopRowLayout {
  left: WeatherDetailsGroupId | null;
  right: readonly WeatherDetailsGroupId[];
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
    { left: "temperatureHumidity", right: ["uv", "wind"] },
    { left: "precipitation", right: ["daylight"] },
  ];
