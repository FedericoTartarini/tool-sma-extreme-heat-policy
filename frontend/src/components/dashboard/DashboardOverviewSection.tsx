import { Anchor, Stack, Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SectionCard } from "@/components/ui/SectionCard";
import { RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";
import { MAX_DASHBOARD_CARDS } from "@/domain/dashboard";
import { useDashboardStore } from "@/store/dashboardStore";

const descriptionTextProps = {
  c: "dimmed" as const,
  fz: { base: "md", sm: "lg" } as const,
  lh: RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT,
};

/**
 * Renders the dashboard heading, summary, and empty-state message.
 */
export function DashboardOverviewSection() {
  const { t } = useTranslation();
  const hasCards = useDashboardStore((state) => state.cards.length > 0);

  return (
    <SectionCard
      title={t("dashboard.header.title")}
      subtitle={
        <Stack gap={0}>
          <Text {...descriptionTextProps}>
            {t("dashboard.header.description.intro")}
          </Text>
          <Text {...descriptionTextProps}>
            <Trans
              i18nKey="dashboard.header.description.modes"
              components={{
                recommendationsLink: (
                  <Anchor
                    component={Link}
                    to="/detailed-recommendations"
                    inherit
                  />
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
      }
    >
      {hasCards ? null : (
        <Text fw={600}>{t("dashboard.emptyState.title")}</Text>
      )}
    </SectionCard>
  );
}
