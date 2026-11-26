import type {
  DayWeatherDetails,
  DayWeatherMetricField,
} from "@/domain/weatherSummary";

export type WeatherDetailsGroupId =
  | "temperatureHumidity"
  | "wind"
  | "uv"
  | "precipitation"
  | "daylight";

export interface WeatherDetailsMetricDefinition {
  field: DayWeatherMetricField;
  labelKey: `home.sections.forecast.weatherDetails.metrics.${DayWeatherMetricField}`;
  unitKey?: "celsius" | "percent" | "metersPerSecond" | "millimeters";
  decimals?: number;
  /** Local HH:MM field appended as "value @ time" when both are available. */
  timeField?: DayWeatherMetricField;
}

export interface WeatherDetailsTemperatureGroupDefinition {
  id: "maxTemperature" | "minTemperature";
  primaryField: DayWeatherMetricField;
  detailFields: readonly DayWeatherMetricField[];
}

export interface WeatherDetailsGroupDefinition {
  id: WeatherDetailsGroupId;
  titleKey: `home.sections.forecast.weatherDetails.groups.${WeatherDetailsGroupId}`;
  temperatureGroups?: readonly WeatherDetailsTemperatureGroupDefinition[];
  metrics: readonly WeatherDetailsMetricDefinition[];
}

export const WEATHER_TEMPERATURE_GROUPS: readonly WeatherDetailsTemperatureGroupDefinition[] =
  [
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
  ];

export const WEATHER_DETAILS_METRICS: readonly WeatherDetailsMetricDefinition[] =
  [
    {
      field: "maxTempC",
      labelKey: "home.sections.forecast.weatherDetails.metrics.maxTempC",
      unitKey: "celsius",
      decimals: 1,
      timeField: "maxTempTimeLocal",
    },
    {
      field: "minTempC",
      labelKey: "home.sections.forecast.weatherDetails.metrics.minTempC",
      unitKey: "celsius",
      decimals: 1,
      timeField: "minTempTimeLocal",
    },
    {
      field: "humidityAtMaxPct",
      labelKey:
        "home.sections.forecast.weatherDetails.metrics.humidityAtMaxPct",
      unitKey: "percent",
      decimals: 0,
    },
    {
      field: "humidityAtMinPct",
      labelKey:
        "home.sections.forecast.weatherDetails.metrics.humidityAtMinPct",
      unitKey: "percent",
      decimals: 0,
    },
    {
      field: "avgWindSpeedMs",
      labelKey: "home.sections.forecast.weatherDetails.metrics.avgWindSpeedMs",
      unitKey: "metersPerSecond",
      decimals: 1,
    },
    {
      field: "uvIndexMax",
      labelKey: "home.sections.forecast.weatherDetails.metrics.uvIndexMax",
      decimals: 1,
      timeField: "uvIndexMaxTimeLocal",
    },
    {
      field: "cumulativeRainfallMm",
      labelKey:
        "home.sections.forecast.weatherDetails.metrics.cumulativeRainfallMm",
      unitKey: "millimeters",
      decimals: 1,
    },
    {
      field: "precipProbMaxPct",
      labelKey:
        "home.sections.forecast.weatherDetails.metrics.precipProbMaxPct",
      unitKey: "percent",
      decimals: 0,
    },
    {
      field: "sunriseLocal",
      labelKey: "home.sections.forecast.weatherDetails.metrics.sunriseLocal",
    },
    {
      field: "sunsetLocal",
      labelKey: "home.sections.forecast.weatherDetails.metrics.sunsetLocal",
    },
  ] as const;

const METRIC_BY_FIELD = new Map(
  WEATHER_DETAILS_METRICS.map((metric) => [metric.field, metric]),
);

export function getWeatherMetricDefinition(
  field: DayWeatherMetricField,
): WeatherDetailsMetricDefinition {
  const metric = METRIC_BY_FIELD.get(field);

  if (!metric) {
    throw new Error(`Unknown weather metric field: ${field}`);
  }

  return metric;
}

export const WEATHER_DETAILS_GROUP_DEFINITIONS: readonly WeatherDetailsGroupDefinition[] =
  [
    {
      id: "temperatureHumidity",
      titleKey:
        "home.sections.forecast.weatherDetails.groups.temperatureHumidity",
      temperatureGroups: WEATHER_TEMPERATURE_GROUPS,
      metrics: [],
    },
    {
      id: "uv",
      titleKey: "home.sections.forecast.weatherDetails.groups.uv",
      metrics: [getWeatherMetricDefinition("uvIndexMax")],
    },
    {
      id: "wind",
      titleKey: "home.sections.forecast.weatherDetails.groups.wind",
      metrics: [getWeatherMetricDefinition("avgWindSpeedMs")],
    },
    {
      id: "precipitation",
      titleKey: "home.sections.forecast.weatherDetails.groups.precipitation",
      metrics: [
        getWeatherMetricDefinition("cumulativeRainfallMm"),
        getWeatherMetricDefinition("precipProbMaxPct"),
      ],
    },
    {
      id: "daylight",
      titleKey: "home.sections.forecast.weatherDetails.groups.daylight",
      metrics: [
        getWeatherMetricDefinition("sunriseLocal"),
        getWeatherMetricDefinition("sunsetLocal"),
      ],
    },
  ];

export function getWeatherMetricValue(
  details: DayWeatherDetails,
  field: DayWeatherMetricField,
): string | number | null | undefined {
  return details[field];
}

export function isWeatherMetricAvailable(
  details: DayWeatherDetails,
  field: DayWeatherMetricField,
): boolean {
  const value = getWeatherMetricValue(details, field);

  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return Number.isFinite(value);
}

export function isWeatherTemperatureGroupAvailable(
  details: DayWeatherDetails,
  group: WeatherDetailsTemperatureGroupDefinition,
): boolean {
  return (
    isWeatherMetricAvailable(details, group.primaryField) ||
    group.detailFields.some((field) => isWeatherMetricAvailable(details, field))
  );
}

export function listAvailableWeatherTemperatureGroups(
  details: DayWeatherDetails,
  groups: readonly WeatherDetailsTemperatureGroupDefinition[] = WEATHER_TEMPERATURE_GROUPS,
): WeatherDetailsTemperatureGroupDefinition[] {
  return groups.filter((group) =>
    isWeatherTemperatureGroupAvailable(details, group),
  );
}

export function listAvailableWeatherMetrics(
  details: DayWeatherDetails,
  metrics: readonly WeatherDetailsMetricDefinition[],
): WeatherDetailsMetricDefinition[] {
  return metrics.filter((metric) =>
    isWeatherMetricAvailable(details, metric.field),
  );
}

export function listAvailableWeatherGroups(
  details: DayWeatherDetails,
): WeatherDetailsGroupDefinition[] {
  return WEATHER_DETAILS_GROUP_DEFINITIONS.flatMap((group) => {
    const temperatureGroups = group.temperatureGroups
      ? listAvailableWeatherTemperatureGroups(details, group.temperatureGroups)
      : [];
    const metrics = listAvailableWeatherMetrics(details, group.metrics);

    if (temperatureGroups.length === 0 && metrics.length === 0) {
      return [];
    }

    return [{ ...group, temperatureGroups, metrics }];
  });
}
