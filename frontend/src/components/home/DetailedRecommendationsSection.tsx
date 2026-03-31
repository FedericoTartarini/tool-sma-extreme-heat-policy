import { Accordion, Badge, List, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  RISK_LEVELS,
  RISK_REGISTRY,
  getRiskBadgeForegroundColor,
  getRiskColor,
} from "@/domain/riskRegistry";
import { RecommendationIconGrid } from "@/components/home/RecommendationIconGrid";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  PARAGRAPH_GAP,
  STANDARD_TEXT_LINE_HEIGHT,
} from "@/config/uiTypography";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Renders static detailed recommendations for all risk levels.
 */
export function DetailedRecommendationsSection() {
  const { t } = useTranslation();

  return (
    <SectionCard title={t("recommendations.manual.title")}>
      <Accordion
        chevronPosition="right"
        variant="separated"
        radius="md"
        defaultValue="low"
      >
        {RISK_LEVELS.map((level) => {
          const details = RISK_REGISTRY[level];
          const keyLabels = toStringArray(
            t(details.keyRecommendationsKey, {
              returnObjects: true,
            }),
          );
          const keyRecommendations = details.keyIconPaths
            .map((iconPath, index) => ({
              src: iconPath,
              label: keyLabels[index] ?? "",
            }))
            .filter((item) => item.label);
          const description = t(details.detailedDescriptionKey);
          const suggestions = toStringArray(
            t(details.detailedSuggestionsKey, {
              returnObjects: true,
            }),
          );

          return (
            <Accordion.Item key={level} value={level}>
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
                  {t(details.levelKey).toUpperCase()}
                </Badge>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap={PARAGRAPH_GAP}>
                  <RecommendationIconGrid items={keyRecommendations} />
                  <Text lh={STANDARD_TEXT_LINE_HEIGHT}>{description}</Text>
                  <Text lh={STANDARD_TEXT_LINE_HEIGHT}>
                    {t("recommendations.detailed.youShouldLabel")}
                  </Text>
                  <List spacing={PARAGRAPH_GAP} size="md">
                    {suggestions.map((text, index) => (
                      <List.Item key={`${level}-suggestion-${index}`}>
                        <Text component="span" lh={STANDARD_TEXT_LINE_HEIGHT}>
                          {text}
                        </Text>
                      </List.Item>
                    ))}
                  </List>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </SectionCard>
  );
}
