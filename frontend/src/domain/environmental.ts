export interface EnvironmentalInputs {
  airTemperatureC: number;
  meanRadiantTemperatureC: number;
  relativeHumidityPct: number;
  windSpeed10mMs: number;
  directNormalIrradianceWm2: number;
}

export type EnvironmentalMetricKey =
  | "airTemperature"
  | "meanRadiantTemperature"
  | "relativeHumidity"
  | "windSpeed"
  | "directNormalIrradiance";

export type EnvironmentalMetricField = keyof EnvironmentalInputs;

export type EnvironmentalMetricIcon =
  | "temperature"
  | "droplet"
  | "wind"
  | "sun";

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

/** Metric order: familiar weather trio first, then radiation inputs. */
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
    key: "relativeHumidity",
    field: "relativeHumidityPct",
    icon: "droplet",
    labelKey: "environmental.relativeHumidity",
    unitKey: "percent",
    decimals: 0,
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
    key: "meanRadiantTemperature",
    field: "meanRadiantTemperatureC",
    icon: "temperature",
    labelKey: "environmental.meanRadiantTemperature",
    unitKey: "celsius",
    decimals: 1,
  },
  {
    key: "directNormalIrradiance",
    field: "directNormalIrradianceWm2",
    icon: "sun",
    labelKey: "environmental.directNormalIrradiance",
    unitKey: "wattsPerSquareMeter",
    decimals: 0,
  },
] as const;
