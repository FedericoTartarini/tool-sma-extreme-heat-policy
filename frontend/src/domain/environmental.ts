/** Domain environmental inputs; field names mirror backend keys in camelCase. */
export interface EnvironmentalInputs {
  airTemperatureC: number;
  meanRadiantTemperatureC: number;
  relativeHumidityPct: number;
  windSpeed10mMs: number;
  directNormalIrradianceWm2: number;
}

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
  field: EnvironmentalMetricField;
  icon: EnvironmentalMetricIcon;
  labelKey: `environmental.${EnvironmentalMetricField}`;
  unitKey: EnvironmentalUnitKey;
  decimals: number;
}

/** Metric order: familiar weather trio first, then radiation inputs. */
export const ENVIRONMENTAL_METRICS: readonly EnvironmentalMetricDefinition[] = [
  {
    field: "airTemperatureC",
    icon: "temperature",
    labelKey: "environmental.airTemperatureC",
    unitKey: "celsius",
    decimals: 1,
  },
  {
    field: "relativeHumidityPct",
    icon: "droplet",
    labelKey: "environmental.relativeHumidityPct",
    unitKey: "percent",
    decimals: 0,
  },
  {
    field: "windSpeed10mMs",
    icon: "wind",
    labelKey: "environmental.windSpeed10mMs",
    unitKey: "metersPerSecond",
    decimals: 1,
  },
  {
    field: "meanRadiantTemperatureC",
    icon: "temperature",
    labelKey: "environmental.meanRadiantTemperatureC",
    unitKey: "celsius",
    decimals: 1,
  },
  {
    field: "directNormalIrradianceWm2",
    icon: "sun",
    labelKey: "environmental.directNormalIrradianceWm2",
    unitKey: "wattsPerSquareMeter",
    decimals: 0,
  },
] as const;
