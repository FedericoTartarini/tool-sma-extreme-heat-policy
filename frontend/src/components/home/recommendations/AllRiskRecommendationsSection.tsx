import { Accordion, Badge, Stack, Text } from "@mantine/core";
import { useQueryStates } from "nuqs";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  RISK_LEVELS,
  getRiskBadgeForegroundColor,
  getRiskColor,
} from "@/domain/riskRegistry";
import { RecommendationLevelDetails } from "@/components/home/recommendations/RecommendationLevelDetails";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";
import { getRecommendationDetailContent } from "@/lib/recommendationDetails";
import {
  RECOMMENDATION_QUERY_PARSERS,
  getRecommendationLevelItemId,
} from "@/lib/recommendationRouteState";

/**
 * Renders static detailed recommendations for all risk levels.
 */
export function AllRiskRecommendationsSection() {
  const { t } = useTranslation();
  const [{ level: linkedLevel }] = useQueryStates(RECOMMENDATION_QUERY_PARSERS);

  // Runs after RouteScrollToTop, so the linked level ends up in view.
  useEffect(() => {
    if (linkedLevel === null) {
      return;
    }

    document
      .getElementById(getRecommendationLevelItemId(linkedLevel))
      ?.scrollIntoView({ block: "start" });
  }, [linkedLevel]);

  return (
    <SectionCard title={t("recommendations.manual.title")}>
      <Stack gap={CONTENT_GAP}>
        <Text lh={STANDARD_TEXT_LINE_HEIGHT}>
          {t("recommendations.manual.intro")}
        </Text>
        {/* Keyed by the linked level so a later ?level change reopens the
            matching item instead of keeping the first one. */}
        <Accordion
          key={linkedLevel ?? "none"}
          chevronPosition="right"
          variant="separated"
          radius="md"
          defaultValue={linkedLevel}
        >
          {RISK_LEVELS.map((level) => {
            const content = getRecommendationDetailContent(level, t);

            return (
              <Accordion.Item
                key={level}
                value={level}
                id={getRecommendationLevelItemId(level)}
              >
                <Accordion.Control>
                  <Badge
                    color={getRiskColor(level)}
                    size="lg"
                    styles={{
                      root: {
                        color: getRiskBadgeForegroundColor(level),
                        paddingInline: 16,
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
                </Accordion.Control>
                <Accordion.Panel>
                  <RecommendationLevelDetails content={content} />
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </Stack>
    </SectionCard>
  );
}
