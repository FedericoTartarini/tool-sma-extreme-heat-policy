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
import { useFocusReturn } from "@mantine/hooks";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CurrentRiskRecommendationsSkeleton } from "@/components/home/HomeSectionSkeletons";
import { RecommendationActionGrid } from "@/components/home/recommendations/RecommendationActionGrid";
import { HomeRecommendationDetails } from "@/components/home/recommendations/HomeRecommendationDetails";
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
  const isMobile = useIsMobileViewport();
  const heatRisk = useHomeHeatRisk();
  const selection = useCoolingSelectionStore((state) => state.selection);
  const saveSelection = useCoolingSelectionStore(
    (state) => state.saveSelection,
  );
  const [activeDialog, setActiveDialog] = useState<
    "preferences" | "details" | "returning-details" | null
  >(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const detailsScrollTop = useRef<number | null>(null);
  const isDetailsOpen =
    activeDialog === "details" || activeDialog === "returning-details";
  const setEditButtonRef = useCallback((button: HTMLButtonElement | null) => {
    editButtonRef.current = button;
    if (!button || detailsScrollTop.current === null) return;
    const dialog = button.closest<HTMLElement>('[role="dialog"]');
    if (dialog) dialog.scrollTop = detailsScrollTop.current;
    detailsScrollTop.current = null;
    button.scrollIntoView({ block: "nearest" });
  }, []);
  const mobileModalOffset = `var(--mantine-spacing-${CONTENT_PADDING.base})`;
  const content = heatRisk.hasCalculatedRisk
    ? getRecommendationDetailContent(heatRisk.riskLevel, t)
    : null;
  // Switching dialogs keeps the Home trigger; return there only after leaving both.
  useFocusReturn({
    opened:
      activeDialog === "preferences" || (isDetailsOpen && content !== null),
  });
  const openPreferences = () => {
    detailsScrollTop.current =
      editButtonRef.current?.closest<HTMLElement>('[role="dialog"]')
        ?.scrollTop ?? 0;
    setActiveDialog("preferences");
  };
  const returnToDetails = () => {
    if (!content) {
      detailsScrollTop.current = null;
      setActiveDialog(null);
      sectionRef.current?.focus({ preventScroll: true });
      return;
    }
    if (content.level !== "high") detailsScrollTop.current = null;
    setActiveDialog("returning-details");
  };
  const closeDetails = () => {
    detailsScrollTop.current = null;
    setActiveDialog(null);
  };
  const modalTitle = (
    <Title order={2} fz={{ base: "h3", sm: "h2" }}>
      {t("recommendations.modal.title")}
    </Title>
  );

  return (
    <>
      <SectionCard title={t("home.sections.keyRecommendations.title")}>
        <Stack ref={sectionRef} tabIndex={-1} gap={CONTENT_GAP}>
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
          onClose={returnToDetails}
        />
      ) : null}
      {isDetailsOpen && content ? (
        <Modal
          opened
          onClose={closeDetails}
          title={modalTitle}
          centered={!isMobile}
          xOffset={isMobile ? mobileModalOffset : undefined}
          yOffset={isMobile ? mobileModalOffset : undefined}
          size="lg"
        >
          <HomeRecommendationDetails
            content={content}
            selection={selection}
            onEditPreferences={openPreferences}
            editButtonRef={setEditButtonRef}
            focusEditOnMount={activeDialog === "returning-details"}
            footer={
              <Button
                component={Link}
                to="/detailed-recommendations"
                variant="light"
                color="brand"
                fullWidth={isMobile}
                onClick={closeDetails}
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
