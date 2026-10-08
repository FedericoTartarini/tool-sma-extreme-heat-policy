import { Accordion, Badge, Flex, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { FlatWeatherDetailsGrid } from "@/components/home/weather/FlatWeatherDetailsGrid";
import { ShowWeatherDetailsSwitch } from "@/components/home/weather/ShowWeatherDetailsSwitch";
import { CONTENT_GAP } from "@/config/uiLayout";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
  getRiskLevelI18nKeys,
} from "@/domain/riskRegistry";
import { toIntlLocale } from "@/i18n/language";
import { bindForecastHoverPoint, buildForecastOption } from "@/lib/riskCharts";
import { formatDateLabel, formatWeekdayLabel } from "@/lib/formatDate";
import { ForecastSkeleton } from "@/components/home/HomeSectionSkeletons";
import { EChart } from "@/components/ui/EChart";
import { SectionCard } from "@/components/ui/SectionCard";
import { useHomeUiStore } from "@/store/homeUiStore";

const DEFAULT_FORECAST_CHART_HEIGHT = 340;
const MOBILE_FORECAST_CHART_HEIGHT = 280;

/**
 * Renders today's 24-hour risk chart, optional weather details, and later days in accordions.
 */
export function ForecastSection() {
  const { i18n, t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const { hasCalculatedRisk, forecast, meta } = useHomeHeatRisk();
  const showWeatherDetails = useHomeUiStore(
    (state) => state.showWeatherDetails,
  );
  if (!hasCalculatedRisk) {
    return (
      <SectionCard
        title={t("home.sections.forecast.title")}
        actions={<ShowWeatherDetailsSwitch disabled />}
      >
        <ForecastSkeleton />
      </SectionCard>
    );
  }

  if (forecast.length === 0) {
    return null;
  }

  const [today, ...nextDays] = forecast;
  const dateLocale = toIntlLocale(i18n.resolvedLanguage);
  const longRiskLabels = createRiskLevelLabels((key) => t(key), "long");

  const forecastLabels = {
    xAxisName: t("charts.forecast.xAxisName"),
    yAxisRiskName: t("charts.forecast.yAxisRiskName"),
    tooltipRiskLabel: t("charts.forecast.tooltipRiskLabel"),
    riskLevelLong: longRiskLabels,
  };

  const chartHeight = isMobile
    ? MOBILE_FORECAST_CHART_HEIGHT
    : DEFAULT_FORECAST_CHART_HEIGHT;

  return (
    <SectionCard
      title={t("home.sections.forecast.title")}
      actions={<ShowWeatherDetailsSwitch />}
    >
      <Stack gap={CONTENT_GAP}>
        <EChart
          option={buildForecastOption(
            today.points,
            forecastLabels,
            undefined,
            isMobile,
          )}
          height={chartHeight}
          bindChart={(chart, container) =>
            bindForecastHoverPoint(chart, container, today.points)
          }
        />

        {showWeatherDetails ? (
          <FlatWeatherDetailsGrid
            details={today.weatherDetails}
            isMobile={isMobile}
            showFullCalendarDayNote
          />
        ) : null}

        <Accordion chevronPosition="right" variant="separated" radius="md">
          {nextDays.map((day) => (
            <Accordion.Item key={day.date} value={day.date}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap">
                  <Flex direction="column">
                    <Text fw={600}>
                      {formatWeekdayLabel(day.date, {
                        locale: dateLocale,
                        timeZone: meta.timeZone,
                      })}
                    </Text>
                    <Text c="dimmed" fz="sm">
                      {formatDateLabel(day.date, {
                        locale: dateLocale,
                        timeZone: meta.timeZone,
                      })}
                    </Text>
                  </Flex>
                  <Group gap={CONTENT_GAP} mr={CONTENT_GAP} wrap="nowrap">
                    <Text fz="sm">
                      {t("home.sections.forecast.maxRiskLabel")}
                    </Text>
                    <Badge
                      color={getRiskColor(day.risk)}
                      styles={{
                        root: {
                          color: getRiskBadgeForegroundColor(day.risk),
                        },
                      }}
                    >
                      {t(getRiskLevelI18nKeys(day.risk).levelKey).toUpperCase()}
                    </Badge>
                  </Group>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Stack gap={CONTENT_GAP}>
                  <EChart
                    option={buildForecastOption(
                      day.points,
                      forecastLabels,
                      undefined,
                      isMobile,
                    )}
                    height={chartHeight}
                    bindChart={(chart, container) =>
                      bindForecastHoverPoint(chart, container, day.points)
                    }
                  />
                  {showWeatherDetails ? (
                    <FlatWeatherDetailsGrid
                      details={day.weatherDetails}
                      isMobile={isMobile}
                    />
                  ) : null}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </SectionCard>
  );
}
