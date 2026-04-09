import { RISK_REGISTRY, type RiskLevel } from "@/domain/riskRegistry";

export interface RecommendationDetailItem {
  src: string;
  label: string;
}

export interface RecommendationDetailContent {
  level: RiskLevel;
  levelLabel: string;
  items: RecommendationDetailItem[];
  description: string;
  suggestions: string[];
}

export type RecommendationDetailTranslator = (
  key: string,
  options?: Record<string, unknown>,
) => unknown;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Resolves translated recommendation detail content for a risk level.
 */
export function getRecommendationDetailContent(
  level: RiskLevel,
  translate: RecommendationDetailTranslator,
): RecommendationDetailContent {
  const details = RISK_REGISTRY[level];
  const labels = toStringArray(
    translate(details.keyRecommendationsKey, {
      returnObjects: true,
    }),
  );

  return {
    level,
    levelLabel: toString(translate(details.levelKey)),
    items: details.keyIconPaths
      .map((iconPath, index) => ({
        src: iconPath,
        label: labels[index] ?? "",
      }))
      .filter((item) => item.label),
    description: toString(translate(details.detailedDescriptionKey)),
    suggestions: toStringArray(
      translate(details.detailedSuggestionsKey, {
        returnObjects: true,
      }),
    ),
  };
}
