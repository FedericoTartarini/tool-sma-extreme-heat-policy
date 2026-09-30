import { useTranslation } from "react-i18next";
import { WeatherMetricCell } from "@/components/home/weather/WeatherMetricCell";
import type { WeatherDetailsTemperatureGroupDefinition } from "@/domain/weatherDetailsRegistry";
import {
  getWeatherMetricDefinition,
  isWeatherMetricAvailable,
} from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";
import { formatWeatherMetricValue } from "@/lib/formatWeatherDetails";

interface WeatherTemperatureGroupCellProps {
  group: WeatherDetailsTemperatureGroupDefinition;
  details: DayWeatherDetails;
}

/**
 * Renders a temperature metric with inline time-of-extreme and humidity details.
 */
export function WeatherTemperatureGroupCell({
  group,
  details,
}: WeatherTemperatureGroupCellProps) {
  const { t } = useTranslation();
  const primaryMetric = getWeatherMetricDefinition(group.primaryField);
  const detailLines = group.detailFields
    .filter((field) => isWeatherMetricAvailable(details, field))
    .map((field) => {
      const metric = getWeatherMetricDefinition(field);

      return `${t(metric.labelKey)}: ${formatWeatherMetricValue(details, metric, t)}`;
    });

  const hasPrimary = isWeatherMetricAvailable(details, group.primaryField);

  if (!hasPrimary && detailLines.length === 0) {
    return null;
  }

  return (
    <WeatherMetricCell
      label={t(primaryMetric.labelKey)}
      value={formatWeatherMetricValue(details, primaryMetric, t)}
      details={detailLines}
    />
  );
}
