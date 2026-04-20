import { IconInfoCircle } from "@tabler/icons-react";
import {
  Button,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CurrentRiskRecommendationsSkeleton } from "@/components/home/HomeSectionSkeletons";
import { RecommendationActionGrid } from "@/components/home/recommendations/RecommendationActionGrid";
import { RecommendationLevelDetails } from "@/components/home/recommendations/RecommendationLevelDetails";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import { UI_INLINE_ICON_SIZE, UI_INLINE_ICON_STROKE } from "@/config/uiScale";
import { getRecommendationDetailContent } from "@/lib/recommendationDetails";

/**
 * Renders compact recommendation cards for the current risk level.
 */
export function CurrentRiskRecommendationsSection() {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const heatRisk = useHomeHeatRisk();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const mobileModalOffset = `var(--mantine-spacing-${CONTENT_PADDING.base})`;

  if (!heatRisk.hasCalculatedRisk) {
    return (
      <SectionCard title={t("home.sections.keyRecommendations.title")}>
        <CurrentRiskRecommendationsSkeleton />
      </SectionCard>
    );
  }

  const content = getRecommendationDetailContent(heatRisk.riskLevel, t);
  const modalTitle = (
    <Title order={2} fz={{ base: "h3", sm: "h2" }}>
      {t("recommendations.modal.title")}
    </Title>
  );

  return (
    <>
      <SectionCard title={t("home.sections.keyRecommendations.title")}>
        <Stack gap={CONTENT_GAP}>
          <Paper withBorder p={CONTENT_PADDING} bg="gray.0">
            <UnstyledButton
              onClick={() => setIsDetailsOpen(true)}
              aria-label={t("home.sections.keyRecommendations.panelAriaLabel")}
              aria-haspopup="dialog"
              styles={() => ({
                root: {
                  display: "block",
                  width: "100%",
                },
              })}
            >
              <RecommendationActionGrid items={content.items} />
            </UnstyledButton>
          </Paper>
          <Text c="dimmed" ta="center" lh={1}>
            <IconInfoCircle
              size={UI_INLINE_ICON_SIZE}
              stroke={UI_INLINE_ICON_STROKE}
              aria-hidden={true}
              color="var(--mantine-color-dimmed)"
              style={{
                verticalAlign: "text-bottom",
                marginInlineEnd: "0.25em",
              }}
            />
            {t("home.sections.keyRecommendations.panelHint")}
          </Text>
        </Stack>
      </SectionCard>
      <Modal
        opened={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={modalTitle}
        centered={!isMobile}
        xOffset={isMobile ? mobileModalOffset : undefined}
        yOffset={isMobile ? mobileModalOffset : undefined}
        size="lg"
      >
        <RecommendationLevelDetails
          content={content}
          showLevelBadge
          footer={
            <Button
              component={Link}
              to="/detailed-recommendations"
              variant="light"
              color="brand"
              fullWidth={isMobile}
              onClick={() => setIsDetailsOpen(false)}
            >
              {t("recommendations.modal.viewAllCta")}
            </Button>
          }
        />
      </Modal>
    </>
  );
}
