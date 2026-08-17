import {
  IconDroplet,
  IconSun,
  IconSunHigh,
  IconTemperature,
  IconWind,
} from "@tabler/icons-react";
import { Divider, Grid, Group, Paper, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  ENVIRONMENTAL_METRICS,
  type EnvironmentalInputs,
  type EnvironmentalMetricDefinition,
  type EnvironmentalMetricIcon,
  type EnvironmentalUnitKey,
} from "@/domain/environmental";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

const DESKTOP_LEFT_COLUMN_COUNT = 3;

const ENVIRONMENTAL_METRIC_ICONS: Record<
  EnvironmentalMetricIcon,
  typeof IconTemperature
> = {
  temperature: IconTemperature,
  wind: IconWind,
  droplet: IconDroplet,
  sun: IconSun,
  sunHigh: IconSunHigh,
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
  const leftMetrics = ENVIRONMENTAL_METRICS.slice(0, DESKTOP_LEFT_COLUMN_COUNT);
  const rightMetrics = ENVIRONMENTAL_METRICS.slice(DESKTOP_LEFT_COLUMN_COUNT);

  return (
    <SectionCard title={t("environmental.rawDataTitle")}>
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
    <Paper withBorder radius="md" p="sm">
      <Stack gap={0}>
        {metrics.map((metric, index) => {
          const IconComponent = ENVIRONMENTAL_METRIC_ICONS[metric.icon];
          const unit = t(`environmental.units.${metric.unitKey}`);

          return (
            <MetricRow
              key={metric.key}
              icon={
                <IconComponent size={20} stroke={1.75} aria-hidden="true" />
              }
              label={t(metric.labelKey)}
              value={formatMetricDisplay(
                inputs[metric.field],
                metric.decimals,
                unit,
                metric.unitKey,
              )}
              showDivider={index < metrics.length - 1}
            />
          );
        })}
      </Stack>
    </Paper>
  );
}

function MetricRow({
  icon,
  label,
  value,
  showDivider,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  showDivider: boolean;
}) {
  return (
    <>
      <Group justify="space-between" align="center" gap={CONTENT_GAP} py="sm">
        <Group gap="sm" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
          {icon}
          <Text fw={600} fz="sm" lh={1.2}>
            {label}
          </Text>
        </Group>
        <Text fw={600} fz="sm" lh={1.2} ta="right" style={{ flexShrink: 0 }}>
          {value}
        </Text>
      </Group>
      {showDivider ? <Divider /> : null}
    </>
  );
}
