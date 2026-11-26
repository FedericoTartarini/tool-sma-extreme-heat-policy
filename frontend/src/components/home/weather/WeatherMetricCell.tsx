import { Stack, Text } from "@mantine/core";

import {
  WEATHER_DETAILS_METRIC_INNER_GAP,
  WEATHER_DETAILS_METRIC_LABEL,
  WEATHER_DETAILS_METRIC_VALUE,
} from "@/config/weatherDetailsPresentation";

interface WeatherMetricCellProps {
  label: string;
  value: string;
  details?: readonly string[];
}

/**
 * Renders one weather metric label/value pair.
 */
export function WeatherMetricCell({
  label,
  value,
  details = [],
}: WeatherMetricCellProps) {
  return (
    <Stack gap={WEATHER_DETAILS_METRIC_INNER_GAP}>
      <Text {...WEATHER_DETAILS_METRIC_LABEL}>{label}</Text>
      <Text {...WEATHER_DETAILS_METRIC_VALUE}>{value}</Text>
      {details.map((line, index) => (
        <Text key={`${label}-${index}`} {...WEATHER_DETAILS_METRIC_LABEL}>
          {line}
        </Text>
      ))}
    </Stack>
  );
}
