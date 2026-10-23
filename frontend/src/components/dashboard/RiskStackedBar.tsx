import { Box, Group, lighten, rem, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  RISK_BAND_SURFACE_LIGHTEN,
  RISK_STACKED_BAR_MARKER_COLOR,
  RISK_STACKED_BAR_MARKER_OUTLINE,
} from "@/config/uiColors";
import {
  getRiskStackedBarAnchorStyle,
  getRiskStackedBarTrackInsetStyle,
  RISK_STACKED_BAR_CHART_PADDING_BOTTOM,
  RISK_STACKED_BAR_CHART_PADDING_TOP,
  RISK_STACKED_BAR_HEIGHT,
  RISK_STACKED_BAR_LEGEND_GAP,
  RISK_STACKED_BAR_MARKER_BOTTOM,
  RISK_STACKED_BAR_MARKER_TOP,
  RISK_STACKED_BAR_MARKER_TRIANGLE,
  RISK_STACKED_BAR_MARKER_WIDTH,
  RISK_STACKED_BAR_PADDING_BELOW_LEGEND,
  RISK_STACKED_BAR_VALUE_TOP,
} from "@/config/uiScale";
import { DASHBOARD_METRIC_VALUE_STYLE } from "@/components/dashboard/dashboardMetricStyles";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import {
  getRiskBands,
  RISK_DISPLAY_AXIS_MAX,
  toRiskDisplayScore,
  toRiskLevel,
} from "@/domain/riskRegistry";

const RISK_STACKED_BAR_VALUE_LABEL_TOP = `calc(${RISK_STACKED_BAR_VALUE_TOP} - ${RISK_STACKED_BAR_CHART_PADDING_TOP})`;

interface RiskStackedBarProps {
  score: number;
}

/**
 * Renders a compact horizontal risk scale with marker and band legend.
 *
 * Band segments use equal width (categorical layout). The marker is positioned
 * linearly on the display axis (0–4), not by threshold geometry — unlike Home
 * forecast charts, which use proportional band widths.
 */
export function RiskStackedBar({ score }: RiskStackedBarProps) {
  const { t } = useTranslation();
  const shortRiskLabels = createRiskLevelLabels((key) => t(key), "short");
  const longRiskLabels = createRiskLevelLabels((key) => t(key), "long");
  const bands = getRiskBands();
  const displayScore = toRiskDisplayScore(score) ?? 0;
  const markerPercent = Math.min(
    100,
    Math.max(0, (displayScore / RISK_DISPLAY_AXIS_MAX) * 100),
  );
  const riskLevel = toRiskLevel(score);
  const scoreLabel = score.toFixed(1);
  const anchorStyle = getRiskStackedBarAnchorStyle(markerPercent);
  const trackInsetStyle = getRiskStackedBarTrackInsetStyle();

  return (
    <Stack
      gap={RISK_STACKED_BAR_LEGEND_GAP}
      w="100%"
      pb={RISK_STACKED_BAR_PADDING_BELOW_LEGEND}
      aria-label={t("dashboard.cards.metrics.stackedBarAriaLabel", {
        score: score.toFixed(1),
        level: longRiskLabels[riskLevel],
      })}
    >
      <Box
        pt={RISK_STACKED_BAR_CHART_PADDING_TOP}
        pb={RISK_STACKED_BAR_CHART_PADDING_BOTTOM}
        pos="relative"
        w="100%"
      >
        <Box
          pos="relative"
          h={RISK_STACKED_BAR_HEIGHT}
          w="100%"
          style={trackInsetStyle}
        >
          <Text
            component="span"
            pos="absolute"
            top={RISK_STACKED_BAR_VALUE_LABEL_TOP}
            fw={700}
            fz="sm"
            lh={1}
            style={{
              ...anchorStyle,
              ...DASHBOARD_METRIC_VALUE_STYLE,
              display: "inline-block",
              zIndex: 1,
            }}
          >
            {scoreLabel}
          </Text>
          <Group
            gap={1}
            wrap="nowrap"
            h="100%"
            w="100%"
            style={{
              borderRadius: rem(999),
              overflow: "hidden",
            }}
          >
            {bands.map((band) => (
              <Box
                key={band.level}
                style={{
                  flex: 1,
                  height: "100%",
                  backgroundColor: lighten(
                    band.color,
                    RISK_BAND_SURFACE_LIGHTEN,
                  ),
                }}
              />
            ))}
          </Group>
          <Box
            aria-hidden
            pos="absolute"
            top={RISK_STACKED_BAR_MARKER_TOP}
            bottom={RISK_STACKED_BAR_MARKER_BOTTOM}
            style={{
              ...anchorStyle,
              width: RISK_STACKED_BAR_MARKER_WIDTH,
              zIndex: 1,
            }}
          >
            <Box
              pos="absolute"
              top={0}
              left="50%"
              style={{
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: `${rem(5)} solid transparent`,
                borderRight: `${rem(5)} solid transparent`,
                borderTop: `${RISK_STACKED_BAR_MARKER_TRIANGLE} solid ${RISK_STACKED_BAR_MARKER_COLOR}`,
              }}
            />
            <Box
              h="100%"
              w="100%"
              style={{
                backgroundColor: RISK_STACKED_BAR_MARKER_COLOR,
                borderRadius: rem(1),
                boxShadow: `0 0 0 1px ${RISK_STACKED_BAR_MARKER_OUTLINE}`,
              }}
            />
          </Box>
        </Box>
      </Box>
      <Group gap={1} wrap="nowrap" w="100%" style={trackInsetStyle}>
        {bands.map((band) => (
          <Box key={band.level} style={{ flex: 1, minWidth: 0 }}>
            <Text fz="xs" c="dimmed" ta="center" lh={1.2}>
              {shortRiskLabels[band.level]}
            </Text>
          </Box>
        ))}
      </Group>
    </Stack>
  );
}
