export interface DayWeatherDetails {
  maxTempC?: number | null;
  minTempC?: number | null;
  humidityAtMaxPct?: number | null;
  humidityAtMinPct?: number | null;
  avgWindSpeedMs?: number | null;
  maxTempTimeLocal?: string | null;
  minTempTimeLocal?: string | null;
  uvIndexMax?: number | null;
  uvIndexMaxTimeLocal?: string | null;
  cumulativeRainfallMm?: number | null;
  precipProbMaxPct?: number | null;
  sunriseLocal?: string | null;
  sunsetLocal?: string | null;
}

export type DayWeatherMetricField = keyof DayWeatherDetails;
