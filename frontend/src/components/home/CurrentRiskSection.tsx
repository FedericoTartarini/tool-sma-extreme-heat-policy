import { IconInfoCircle } from "@tabler/icons-react";
import { Badge, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CONTENT_GAP } from "@/config/uiLayout";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
} from "@/domain/riskRegistry";
import { CurrentRiskSkeleton } from "@/components/home/HomeSectionSkeletons";
import { RiskGauge } from "@/components/home/RiskGauge";
import { SectionCard } from "@/components/ui/SectionCard";
import { UI_INLINE_ICON_SIZE, UI_INLINE_ICON_STROKE } from "@/config/uiScale";

const RISK_BADGE_SHADOW = "0 10px 24px rgba(15, 23, 42, 0.08)";

/**
 * Renders the current risk gauge for the selected sport/location.
 */
export function CurrentRiskSection() {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const heatRisk = useHomeHeatRisk();
  const longRiskLabels = createRiskLevelLabels((key) => t(key), "long");

  if (!heatRisk.hasCalculatedRisk) {
    return (
      <SectionCard title={t("home.sections.currentRisk.title")}>
        <CurrentRiskSkeleton />
      </SectionCard>
    );
  }

  const riskBadgeColor = getRiskColor(heatRisk.riskLevel);
  const riskBadgeForegroundColor = getRiskBadgeForegroundColor(
    heatRisk.riskLevel,
  );
  const riskBadgeValue = longRiskLabels[heatRisk.riskLevel].toUpperCase();

  return (
    <SectionCard title={t("home.sections.currentRisk.title")}>
      <Stack gap={CONTENT_GAP} align="center">
        <RiskGauge
          score={heatRisk.risk.riskLevelInterpolated}
          title={t("charts.gauge.seriesName")}
          unavailableLabel={t("charts.gauge.riskUnavailable")}
          riskLevelLabels={longRiskLabels}
        />
        <Badge
          component={Link}
          to="/detailed-recommendations"
          color={riskBadgeColor}
          size={isMobile ? "lg" : "xl"}
          radius="xl"
          rightSection={
            <IconInfoCircle
              size={UI_INLINE_ICON_SIZE}
              stroke={UI_INLINE_ICON_STROKE}
              aria-hidden={true}
            />
          }
          style={{
            textDecoration: "none",
          }}
          styles={{
            root: {
              color: riskBadgeForegroundColor,
              boxShadow: RISK_BADGE_SHADOW,
              paddingInlineStart: 16,
              paddingInlineEnd: 12,
            },
            label: {
              fontSize: isMobile
                ? "var(--mantine-font-size-md)"
                : "var(--mantine-font-size-lg)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textAlign: "left",
            },
            section: {
              marginInlineStart: 4,
            },
          }}
        >
          {riskBadgeValue}
        </Badge>
      </Stack>
    </SectionCard>
  );
}
