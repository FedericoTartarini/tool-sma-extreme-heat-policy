import { Badge, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { RiskLevel } from "@/domain/risk";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
  getRiskLevelI18nKeys,
} from "@/domain/riskRegistry";
import { DASHBOARD_METRIC_VALUE_STYLE } from "@/components/dashboard/dashboardMetricStyles";
import { RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";

const METRIC_LABEL_TEXT_PROPS = {
  c: "dimmed",
  fz: "sm",
  lh: RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT,
} as const;

function MetricSecondarySpan({
  children,
  color,
  fw,
}: {
  children: ReactNode;
  color?: string;
  fw?: number;
}) {
  return (
    <Text
      component="span"
      inherit
      c={color}
      fw={fw}
      style={DASHBOARD_METRIC_VALUE_STYLE}
    >
      {children}
    </Text>
  );
}

function MetricSecondaryLine({ children }: { children: ReactNode }) {
  return <Text {...METRIC_LABEL_TEXT_PROPS}>{children}</Text>;
}

function DashboardRiskLevelBadge({ level }: { level: RiskLevel }) {
  const { t } = useTranslation();

  return (
    <Badge
      component="span"
      color={getRiskColor(level)}
      styles={{
        root: {
          color: getRiskBadgeForegroundColor(level),
          verticalAlign: "middle",
        },
      }}
    >
      {t(getRiskLevelI18nKeys(level).levelKey).toUpperCase()}
    </Badge>
  );
}

interface DashboardMetricColumnLabelProps {
  children: ReactNode;
}

export function DashboardMetricColumnLabel({
  children,
}: DashboardMetricColumnLabelProps) {
  return <Text {...METRIC_LABEL_TEXT_PROPS}>{children}</Text>;
}

interface DashboardCardTodayLineProps {
  score: number;
  level: RiskLevel;
}

export function DashboardCardTodayLine({
  score,
  level,
}: DashboardCardTodayLineProps) {
  const { t } = useTranslation();

  return (
    <MetricSecondaryLine>
      {t("dashboard.cards.metrics.maxRiskToday")}{" "}
      <MetricSecondarySpan>{score.toFixed(1)} </MetricSecondarySpan>
      <DashboardRiskLevelBadge level={level} />
    </MetricSecondaryLine>
  );
}

interface DashboardCardRangeLineProps {
  minScore: number;
  minLevel: RiskLevel;
  maxScore: number;
  maxLevel: RiskLevel;
}

export function DashboardCardRangeLine({
  minScore,
  minLevel,
  maxScore,
  maxLevel,
}: DashboardCardRangeLineProps) {
  const { t } = useTranslation();

  return (
    <MetricSecondaryLine>
      {t("dashboard.cards.metrics.minimum")}{" "}
      <MetricSecondarySpan>{minScore.toFixed(1)} </MetricSecondarySpan>
      <DashboardRiskLevelBadge level={minLevel} />
      {t("dashboard.cards.metrics.rangeSeparator")}
      {t("dashboard.cards.metrics.maximum")}{" "}
      <MetricSecondarySpan>{maxScore.toFixed(1)} </MetricSecondarySpan>
      <DashboardRiskLevelBadge level={maxLevel} />
    </MetricSecondaryLine>
  );
}
