// Reduce nesting and improve spacing: use a clearer Stack gap, responsive chart height, and fewer small wrapper components
import { Accordion, Badge, Flex, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
  getRiskLevelI18nKeys,
} from "@/domain/riskRegistry";
import { toIntlLocale } from "@/i18n/language";
import { formatDateLabel, formatWeekdayLabel } from "@/lib/formatDate";
import { ForecastChart } from "@/components/home/ForecastChart";
import { ForecastSkeleton } from "@/components/home/HomeSectionSkeletons";
import { SectionCard } from "@/components/ui/SectionCard";

/**
 * Renders the 24-hour forecast chart and upcoming daily forecast accordions.
 */
export function ForecastSection() {
  const { i18n, t } = useTranslation();
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
  const dateLocale = toIntlLocale(i18n.resolvedLanguage);
  const dateFormatOptions = {
    locale: dateLocale,
    timeZone: meta.timeZone,
  };
  const toDayLabel = (date: string) =>
    `${formatWeekdayLabel(date, dateFormatOptions)} ${formatDateLabel(date, dateFormatOptions)}`;

  return (
    <SectionCard title={t("home.sections.forecast.title")}>
      {/* Use a single Stack with an explicit gap to control spacing between chart and accordion */}
      <Stack gap={CONTENT_GAP}>
        <ForecastChart
          points={today.points}
          dayLabel={toDayLabel(today.date)}
        />

        <Accordion chevronPosition="right" variant="separated" radius="md">
          {nextDays.map((day) => (
            <Accordion.Item key={day.date} value={day.date}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap">
                  {/* Reduced nesting: simple column for weekday + date */}
                  <Flex direction={"column"}>
                    <Text fw={600}>
                      {formatWeekdayLabel(day.date, dateFormatOptions)}
                    </Text>
                    <Text c="dimmed" fz="sm">
                      {formatDateLabel(day.date, dateFormatOptions)}
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
                <ForecastChart
                  points={day.points}
                  dayLabel={toDayLabel(day.date)}
                />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </SectionCard>
  );
}
