import { Badge, Box, Stack, Switch } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CONTENT_GAP } from "@/config/uiLayout";
import { getHeatRiskProfileMeta } from "@/domain/heatRiskProfile";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { useSetShowRawData } from "@/hooks/useSetShowRawData";
import { useHomeUiStore } from "@/store/homeUiStore";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
} from "@/domain/riskRegistry";
import { CurrentRiskSkeleton } from "@/components/home/HomeSectionSkeletons";
import { RiskGauge } from "@/components/home/RiskGauge";
import { SectionCard } from "@/components/ui/SectionCard";
import { useHomeStore } from "@/store/homeStore";

const RISK_BADGE_SHADOW = "0 10px 24px rgba(15, 23, 42, 0.08)";

/**
 * Renders the current risk gauge for the selected sport/location.
 */
export function CurrentRiskSection() {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const heatRisk = useHomeHeatRisk();
  const showRawData = useHomeUiStore((state) => state.showRawData);
  const setShowRawData = useSetShowRawData();
  const profile = useHomeStore((state) => state.profile);
  const longRiskLabels = createRiskLevelLabels((key) => t(key), "long");
  const profileLabel = t(getHeatRiskProfileMeta(profile).labelKey);
  const currentRiskTitle = t("home.sections.currentRisk.title");
  const rawDataToggle = (
    <Switch
      label={t("environmental.toggleLabel")}
      checked={showRawData}
      onChange={(event) => setShowRawData(event.currentTarget.checked)}
      disabled={!heatRisk.hasCalculatedRisk}
      size={isMobile ? "sm" : "md"}
    />
  );
  const profileBadge = (
    <Box
      style={{
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Badge
        variant="light"
        size={isMobile ? "lg" : "xl"}
        radius="xl"
        tt="none"
      >
        {profileLabel}
      </Badge>
    </Box>
  );

  if (!heatRisk.hasCalculatedRisk) {
    return (
      <SectionCard title={currentRiskTitle} actions={rawDataToggle}>
        <Stack gap={CONTENT_GAP} align="center">
          {profileBadge}
          <CurrentRiskSkeleton />
        </Stack>
      </SectionCard>
    );
  }

  const riskBadgeColor = getRiskColor(heatRisk.riskLevel);
  const riskBadgeForegroundColor = getRiskBadgeForegroundColor(
    heatRisk.riskLevel,
  );
  const riskBadgeValue = longRiskLabels[heatRisk.riskLevel].toUpperCase();

  return (
    <SectionCard title={currentRiskTitle} actions={rawDataToggle}>
      <Stack gap={CONTENT_GAP} align="center">
        {profileBadge}
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
          style={{
            textDecoration: "none",
          }}
          styles={{
            root: {
              color: riskBadgeForegroundColor,
              boxShadow: RISK_BADGE_SHADOW,
            },
            label: {
              fontSize: isMobile
                ? "var(--mantine-font-size-md)"
                : "var(--mantine-font-size-lg)",
              fontWeight: 700,
              letterSpacing: "0.06em",
            },
          }}
        >
          {riskBadgeValue}
        </Badge>
      </Stack>
    </SectionCard>
  );
}
