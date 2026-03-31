// Reduce nesting and improve spacing: use a clearer Stack gap, responsive chart height, and fewer small wrapper components
import { Accordion, Badge, Flex, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
  getRiskLevelI18nKeys,
} from "@/domain/riskRegistry";
import { bindForecastHoverPoint, buildForecastOption } from "@/lib/riskCharts";
import { formatDateLabel, formatWeekdayLabel } from "@/lib/formatDate";
import { ForecastSkeleton } from "@/components/home/HomeSectionSkeletons";
import { EChart } from "@/components/ui/EChart";
import { SectionCard } from "@/components/ui/SectionCard";

const DEFAULT_FORECAST_CHART_HEIGHT = 340;
const MOBILE_FORECAST_CHART_HEIGHT = 280;

/**
 * Renders the 24-hour forecast chart and upcoming daily forecast accordions.
 */
export function ForecastSection() {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const { hasCalculatedRisk, forecast, meta } = useHomeHeatRisk();

  if (!hasCalculatedRisk) {
    return (
      <SectionCard title={t("home.sections.forecast.title")}>
        <ForecastSkeleton />
      </SectionCard>
    );
  }

  if (forecast.length === 0) {
    return null;
  }

  const [today, ...nextDays] = forecast;
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
    <SectionCard title={t("home.sections.forecast.title")}>
      {/* Use a single Stack with an explicit gap to control spacing between chart and accordion */}
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

        <Accordion chevronPosition="right" variant="separated" radius="md">
          {nextDays.map((day) => (
            <Accordion.Item key={day.date} value={day.date}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap">
                  {/* Reduced nesting: simple column for weekday + date */}
                  <Flex direction={"column"}>
                    <Text fw={600}>
                      {formatWeekdayLabel(day.date, {
                        timeZone: meta.timeZone,
                      })}
                    </Text>
                    <Text c="dimmed" fz="sm">
                      {formatDateLabel(day.date, {
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
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </SectionCard>
  );
}
