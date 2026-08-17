export interface EnvironmentalInputs {
  airTemperatureC: number;
  meanRadiantTemperatureC: number;
  relativeHumidityPct: number;
  windSpeed10mMs: number;
  directNormalIrradianceWm2: number;
}

export type EnvironmentalMetricKey =
  | "airTemperature"
  | "windSpeed"
  | "relativeHumidity"
  | "meanRadiantTemperature"
  | "directNormalIrradiance";

export type EnvironmentalMetricField = keyof EnvironmentalInputs;

export type EnvironmentalMetricIcon =
  | "temperature"
  | "wind"
  | "droplet"
  | "sun"
  | "sunHigh";

export type EnvironmentalUnitKey =
  | "celsius"
  | "percent"
  | "metersPerSecond"
  | "wattsPerSquareMeter";

export interface EnvironmentalMetricDefinition {
  key: EnvironmentalMetricKey;
  field: EnvironmentalMetricField;
  icon: EnvironmentalMetricIcon;
  labelKey: `environmental.${EnvironmentalMetricKey}`;
  unitKey: EnvironmentalUnitKey;
  decimals: number;
}

export const ENVIRONMENTAL_METRICS: readonly EnvironmentalMetricDefinition[] = [
  {
    key: "airTemperature",
    field: "airTemperatureC",
    icon: "temperature",
    labelKey: "environmental.airTemperature",
    unitKey: "celsius",
    decimals: 1,
  },
  {
    key: "windSpeed",
    field: "windSpeed10mMs",
    icon: "wind",
    labelKey: "environmental.windSpeed",
    unitKey: "metersPerSecond",
    decimals: 1,
  },
  {
    key: "relativeHumidity",
    field: "relativeHumidityPct",
    icon: "droplet",
    labelKey: "environmental.relativeHumidity",
    unitKey: "percent",
    decimals: 0,
  },
  {
    key: "meanRadiantTemperature",
    field: "meanRadiantTemperatureC",
    icon: "sun",
    labelKey: "environmental.meanRadiantTemperature",
    unitKey: "celsius",
    decimals: 1,
  },
  {
    key: "directNormalIrradiance",
    field: "directNormalIrradianceWm2",
    icon: "sunHigh",
    labelKey: "environmental.directNormalIrradiance",
    unitKey: "wattsPerSquareMeter",
    decimals: 0,
  },
] as const;
