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
import { useFocusReturn, useHover } from "@mantine/hooks";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CurrentRiskRecommendationsSkeleton } from "@/components/home/HomeSectionSkeletons";
import { RecommendationActionGrid } from "@/components/home/recommendations/RecommendationActionGrid";
import { RecommendationLevelDetails } from "@/components/home/recommendations/RecommendationLevelDetails";
import { CoolingPreferencesModal } from "@/components/home/recommendations/CoolingPreferencesModal";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import { UI_INLINE_ICON_SIZE, UI_INLINE_ICON_STROKE } from "@/config/uiScale";
import { getRecommendationDetailContent } from "@/lib/recommendationDetails";
import { useCoolingSelectionStore } from "@/store/coolingSelectionStore";

/**
 * Renders compact recommendation cards for the current risk level.
 */
export function CurrentRiskRecommendationsSection() {
  const { t } = useTranslation();
  const { hovered: editHovered, ref: editRef } = useHover<HTMLSpanElement>();
  const isMobile = useIsMobileViewport();
  const heatRisk = useHomeHeatRisk();
  const selection = useCoolingSelectionStore((state) => state.selection);
  const saveSelection = useCoolingSelectionStore(
    (state) => state.saveSelection,
  );
  const [activeDialog, setActiveDialog] = useState<
    "preferences" | "details" | null
  >(null);
  // Dialogs unmount on close; keep focus restoration in their mounted parent.
  useFocusReturn({ opened: activeDialog !== null });
  const mobileModalOffset = `var(--mantine-spacing-${CONTENT_PADDING.base})`;
  const content = heatRisk.hasCalculatedRisk
    ? getRecommendationDetailContent(heatRisk.riskLevel, t)
    : null;
  const modalTitle = (
    <Title order={2} fz={{ base: "h3", sm: "h2" }}>
      {t("recommendations.modal.title")}
    </Title>
  );

  return (
    <>
      <SectionCard title={t("home.sections.keyRecommendations.title")}>
        <Stack gap={CONTENT_GAP}>
          <UnstyledButton
            onClick={() => setActiveDialog("preferences")}
            aria-haspopup="dialog"
          >
            <Text span c="dimmed" size="sm" style={{ whiteSpace: "nowrap" }}>
              <Trans
                i18nKey="home.coolingPreferences.entry"
                components={{
                  edit: (
                    <Text
                      span
                      ref={editRef}
                      c={editHovered ? "gray.7" : "dimmed"}
                      td="underline"
                    />
                  ),
                }}
              />
            </Text>
          </UnstyledButton>
          {content ? (
            <>
              <Paper withBorder p={CONTENT_PADDING} bg="gray.0">
                <UnstyledButton
                  onClick={() => setActiveDialog("details")}
                  aria-label={t(
                    "home.sections.keyRecommendations.panelAriaLabel",
                  )}
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
            </>
          ) : (
            <CurrentRiskRecommendationsSkeleton />
          )}
        </Stack>
      </SectionCard>
      {activeDialog === "preferences" ? (
        <CoolingPreferencesModal
          selection={selection}
          onSave={saveSelection}
          onClose={() => setActiveDialog(null)}
        />
      ) : null}
      {activeDialog === "details" && content ? (
        <Modal
          opened
          onClose={() => setActiveDialog(null)}
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
                onClick={() => setActiveDialog(null)}
              >
                {t("recommendations.modal.viewAllCta")}
              </Button>
            }
          />
        </Modal>
      ) : null}
    </>
  );
}
