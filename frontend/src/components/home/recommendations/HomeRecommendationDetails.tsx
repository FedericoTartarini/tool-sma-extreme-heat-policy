import { Alert, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import type { ReactNode } from "react";
import { RecommendationLevelDetails } from "@/components/home/recommendations/RecommendationLevelDetails";
import {
  ACTIVE_COOLING_OPTION_TO_METHOD_IDS,
  resolveActiveCoolingAdvice,
  type CoolingOptionId,
  type CoolingSelection,
} from "@/domain/activeCooling";
import {
  personaliseHomeRecommendationContent,
  type RecommendationDetailContent,
} from "@/lib/recommendationDetails";

interface HomeRecommendationDetailsProps {
  content: RecommendationDetailContent;
  selection: CoolingSelection<CoolingOptionId>;
  footer?: ReactNode;
}

/** Home-only presentation of the current risk policy details. */
export function HomeRecommendationDetails({
  content,
  selection,
  footer,
}: HomeRecommendationDetailsProps) {
  const { t } = useTranslation();
  const personalised = personaliseHomeRecommendationContent(
    content,
    resolveActiveCoolingAdvice(selection, ACTIVE_COOLING_OPTION_TO_METHOD_IDS),
  );
  const showReminder =
    content.level === "high" && personalised.showPrepareCoolingReminder;

  return (
    <RecommendationLevelDetails
      content={personalised.content}
      showLevelBadge
      footer={
        showReminder ? (
          <Stack gap={CONTENT_GAP}>
            <Alert color="yellow" role="note">
              {t("home.coolingPreferences.prepareReminder")}
            </Alert>
            {footer}
          </Stack>
        ) : (
          footer
        )
      }
    />
  );
}
