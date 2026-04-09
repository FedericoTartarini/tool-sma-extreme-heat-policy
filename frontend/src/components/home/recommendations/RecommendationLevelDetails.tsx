import { Badge, List, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
} from "@/domain/riskRegistry";
import { RecommendationActionGrid } from "@/components/home/recommendations/RecommendationActionGrid";
import type { RecommendationDetailContent as RecommendationDetailContentModel } from "@/lib/recommendationDetails";
import {
  PARAGRAPH_GAP,
  STANDARD_TEXT_LINE_HEIGHT,
} from "@/config/uiTypography";

interface RecommendationLevelDetailsProps {
  content: RecommendationDetailContentModel;
  showLevelBadge?: boolean;
  footer?: ReactNode;
}

/**
 * Renders detailed recommendation copy for a risk level.
 */
export function RecommendationLevelDetails({
  content,
  showLevelBadge = false,
  footer,
}: RecommendationLevelDetailsProps) {
  const { t } = useTranslation();

  return (
    <Stack gap={PARAGRAPH_GAP}>
      {showLevelBadge ? (
        <Badge
          color={getRiskColor(content.level)}
          size="lg"
          styles={{
            root: {
              color: getRiskBadgeForegroundColor(content.level),
              paddingInline: 16,
              alignSelf: "flex-start",
            },
            label: {
              fontSize: "var(--mantine-font-size-md)",
              fontWeight: 700,
              letterSpacing: "0.06em",
            },
          }}
        >
          {content.levelLabel.toUpperCase()}
        </Badge>
      ) : null}
      <RecommendationActionGrid items={content.items} />
      <Text lh={STANDARD_TEXT_LINE_HEIGHT}>{content.description}</Text>
      <Text lh={STANDARD_TEXT_LINE_HEIGHT}>
        {t("recommendations.detailed.youShouldLabel")}
      </Text>
      <List spacing={PARAGRAPH_GAP} size="md">
        {content.suggestions.map((text, index) => (
          <List.Item key={`${content.level}-suggestion-${index}`}>
            <Text component="span" lh={STANDARD_TEXT_LINE_HEIGHT}>
              {text}
            </Text>
          </List.Item>
        ))}
      </List>
      {footer}
    </Stack>
  );
}
