import { Anchor, Button, Collapse, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useId } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DashboardViewModeSelector } from "@/components/dashboard/DashboardViewModeSelector";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";
import { MAX_DASHBOARD_CARDS } from "@/domain/dashboard";
import { useDashboardStore } from "@/store/dashboardStore";

const descriptionTextProps = {
  c: "dimmed" as const,
  fz: { base: "md", sm: "lg" } as const,
  lh: RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT,
};

export function DashboardOverviewSection() {
  const { t } = useTranslation();
  const summaryId = useId();
  const [isSummaryOpen, { toggle: toggleSummary }] = useDisclosure(false);
  const hasCards = useDashboardStore((state) => state.cards.length > 0);
  const viewMode = useDashboardStore((state) => state.viewMode);
  const setViewMode = useDashboardStore((state) => state.setViewMode);

  const summary = (
    <Stack gap={0}>
      <Text {...descriptionTextProps}>
        {t("dashboard.header.description.intro")}
      </Text>
      <Text {...descriptionTextProps}>
        <Trans
          i18nKey="dashboard.header.description.modes"
          components={{
            recommendationsLink: (
              <Anchor component={Link} to="/detailed-recommendations" inherit />
            ),
          }}
        />
      </Text>
      <Text {...descriptionTextProps}>
        {t("dashboard.header.description.note", {
          maxCards: MAX_DASHBOARD_CARDS,
        })}
      </Text>
    </Stack>
  );

  if (!hasCards) {
    return (
      <SectionCard title={t("dashboard.header.title")} subtitle={summary}>
        <Text fw={600}>{t("dashboard.emptyState.title")}</Text>
      </SectionCard>
    );
  }

  const SummaryToggleIcon = isSummaryOpen ? IconChevronUp : IconChevronDown;

  return (
    <SectionCard title={t("dashboard.header.title")}>
      <Stack gap={CONTENT_GAP}>
        <Stack gap="xs" align="flex-start">
          <Button
            variant="subtle"
            px={0}
            onClick={toggleSummary}
            aria-expanded={isSummaryOpen}
            aria-controls={summaryId}
            rightSection={<SummaryToggleIcon size={16} />}
          >
            {t(
              isSummaryOpen
                ? "dashboard.header.hideSummary"
                : "dashboard.header.showSummary",
            )}
          </Button>
          <Collapse in={isSummaryOpen} id={summaryId}>
            {summary}
          </Collapse>
        </Stack>

        <Stack gap="xs">
          <Text fw={600}>{t("dashboard.viewMode.label")}</Text>
          <DashboardViewModeSelector value={viewMode} onChange={setViewMode} />
        </Stack>
      </Stack>
    </SectionCard>
  );
}
