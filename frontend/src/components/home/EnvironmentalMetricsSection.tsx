import {
  IconDroplet,
  IconSun,
  IconTemperature,
  IconWind,
} from "@tabler/icons-react";
import { Grid, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  UI_INLINE_ICON_SIZE,
  UI_INLINE_ICON_STROKE,
  UI_TITLE_ICON_SIZE,
  UI_TITLE_ICON_STROKE,
} from "@/config/uiScale";
import { COMPACT_LABEL_TEXT_PROPS } from "@/config/uiTypography";
import {
  ENVIRONMENTAL_METRICS,
  type EnvironmentalInputs,
  type EnvironmentalMetricDefinition,
  type EnvironmentalMetricIcon,
  type EnvironmentalUnitKey,
} from "@/domain/environmental";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

const ENVIRONMENTAL_METRIC_ICONS: Record<
  EnvironmentalMetricIcon,
  typeof IconTemperature
> = {
  temperature: IconTemperature,
  droplet: IconDroplet,
  wind: IconWind,
  sun: IconSun,
};

const UNIT_SPACING_BEFORE_VALUE: Record<EnvironmentalUnitKey, boolean> = {
  celsius: false,
  percent: false,
  metersPerSecond: true,
  wattsPerSquareMeter: true,
};

interface EnvironmentalMetricsSectionProps {
  inputs: EnvironmentalInputs;
}

/**
 * Renders the raw environmental data section in its own card.
 */
export function EnvironmentalMetricsSection({
  inputs,
}: EnvironmentalMetricsSectionProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const leftMetrics = ENVIRONMENTAL_METRICS.slice(0, 3);
  const rightMetrics = ENVIRONMENTAL_METRICS.slice(3);

  return (
    <SectionCard
      title={t("environmental.rawDataTitle")}
      titleIcon={
        <IconSun
          size={UI_TITLE_ICON_SIZE}
          stroke={UI_TITLE_ICON_STROKE}
          aria-hidden={true}
        />
      }
    >
      {isMobile ? (
        <MetricsList inputs={inputs} metrics={ENVIRONMENTAL_METRICS} />
      ) : (
        <Grid gutter={CONTENT_GAP}>
          <Grid.Col span={6}>
            <MetricsList inputs={inputs} metrics={leftMetrics} />
          </Grid.Col>
          <Grid.Col span={6}>
            <MetricsList inputs={inputs} metrics={rightMetrics} />
          </Grid.Col>
        </Grid>
      )}
    </SectionCard>
  );
}

function formatMetricDisplay(
  value: number,
  decimals: number,
  unit: string,
  unitKey: EnvironmentalUnitKey,
): string {
  const separator = UNIT_SPACING_BEFORE_VALUE[unitKey] ? " " : "";

  return `${value.toFixed(decimals)}${separator}${unit}`;
}

function MetricsList({
  inputs,
  metrics,
}: {
  inputs: EnvironmentalInputs;
  metrics: readonly EnvironmentalMetricDefinition[];
}) {
  const { t } = useTranslation();

  return (
    <Stack gap={CONTENT_GAP}>
      {metrics.map((metric) => {
        const IconComponent = ENVIRONMENTAL_METRIC_ICONS[metric.icon];
        const unit = t(`environmental.units.${metric.unitKey}`);

        return (
          <MetricRow
            key={metric.key}
            icon={
              <IconComponent
                size={UI_INLINE_ICON_SIZE}
                stroke={UI_INLINE_ICON_STROKE}
                aria-hidden={true}
              />
            }
            label={t(metric.labelKey)}
            value={formatMetricDisplay(
              inputs[metric.field],
              metric.decimals,
              unit,
              metric.unitKey,
            )}
          />
        );
      })}
    </Stack>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Group
      justify="space-between"
      align="center"
      gap={CONTENT_GAP}
      wrap="nowrap"
    >
      <Group gap={CONTENT_GAP} align="center" wrap="nowrap" flex={1} miw={0}>
        {icon}
        <Text {...COMPACT_LABEL_TEXT_PROPS}>{label}</Text>
      </Group>
      <Text {...COMPACT_LABEL_TEXT_PROPS} ta="right">
        {value}
      </Text>
    </Group>
  );
}
