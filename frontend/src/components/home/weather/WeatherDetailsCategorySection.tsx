import { SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { WeatherMetricCell } from "@/components/home/weather/WeatherMetricCell";
import { WeatherTemperatureGroupCell } from "@/components/home/weather/WeatherTemperatureGroupCell";
import {
  WEATHER_DETAILS_GRID_SPACING,
  WEATHER_DETAILS_TITLE,
} from "@/config/weatherDetailsPresentation";
import type { WeatherDetailsGroupDefinition } from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";
import { toIntlLocale } from "@/i18n/language";
import { formatWeatherMetricValue } from "@/lib/formatWeatherDetails";

interface WeatherDetailsCategorySectionProps {
  group: WeatherDetailsGroupDefinition;
  details: DayWeatherDetails;
  metricColumns: number;
}

/**
 * Renders one weather category title and its metrics grid.
 */
export function WeatherDetailsCategorySection({
  group,
  details,
  metricColumns,
}: WeatherDetailsCategorySectionProps) {
  const { i18n, t } = useTranslation();
  const locale = toIntlLocale(i18n.resolvedLanguage);
  const temperatureGroups = group.temperatureGroups ?? [];

  return (
    <Stack gap={WEATHER_DETAILS_GRID_SPACING}>
      <Text {...WEATHER_DETAILS_TITLE}>{t(group.titleKey)}</Text>
      {temperatureGroups.length > 0 ? (
        <SimpleGrid cols={2} spacing={WEATHER_DETAILS_GRID_SPACING}>
          {temperatureGroups.map((temperatureGroup) => (
            <WeatherTemperatureGroupCell
              key={temperatureGroup.id}
              group={temperatureGroup}
              details={details}
            />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={metricColumns} spacing={WEATHER_DETAILS_GRID_SPACING}>
          {group.metrics.map((metric) => (
            <WeatherMetricCell
              key={metric.field}
              label={t(metric.labelKey)}
              value={formatWeatherMetricValue(details, metric, t, locale)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
