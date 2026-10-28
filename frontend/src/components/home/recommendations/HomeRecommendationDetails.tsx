import { Alert, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import { STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";
import type { ReactNode, Ref } from "react";
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
  onEditPreferences: () => void;
  editButtonRef?: Ref<HTMLButtonElement>;
  focusEditOnMount?: boolean;
  footer?: ReactNode;
}

/** Home-only presentation of the current risk policy details. */
export function HomeRecommendationDetails({
  content,
  selection,
  onEditPreferences,
  editButtonRef,
  focusEditOnMount = false,
  footer,
}: HomeRecommendationDetailsProps) {
  const { t } = useTranslation();
  const statusKey = !selection.configured
    ? "notSetUp"
    : selection.selectedOptionIds.length > 0
      ? "personalised"
      : "noneSelected";
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
      beforeSuggestions={
        content.level === "high" ? (
          <Text lh={STANDARD_TEXT_LINE_HEIGHT}>
            {t("home.coolingPreferences.title")}
            {": "}
            <Text span inherit c="gray.7">
              {t(`home.coolingPreferences.status.${statusKey}`)}
            </Text>
            {" · "}
            <UnstyledButton
              ref={editButtonRef}
              onClick={onEditPreferences}
              aria-label={t("home.coolingPreferences.editAriaLabel")}
              aria-haspopup="dialog"
              data-autofocus={focusEditOnMount || undefined}
              c="gray.7"
              fz="inherit"
              mih={30}
              px={2}
              style={{ textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              {t("home.coolingPreferences.edit")}
            </UnstyledButton>
          </Text>
        ) : undefined
      }
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
