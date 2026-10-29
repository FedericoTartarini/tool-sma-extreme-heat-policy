import {
  ACTIVE_COOLING_METHOD_IDS,
  type ActiveCoolingResolution,
} from "@/domain/activeCooling";
import {
  RISK_REGISTRY,
  type RecommendationActionId,
  type RiskLevel,
} from "@/domain/riskRegistry";
import type { ResponsiveImageAsset } from "@/lib/responsiveImage";

export interface RecommendationDetailItem {
  id: RecommendationActionId;
  image: ResponsiveImageAsset | null;
  label: string;
}

export interface RecommendationDetailContent {
  level: RiskLevel;
  levelLabel: string;
  items: RecommendationDetailItem[];
  description: string;
  suggestions: string[];
}

export interface PersonalisedHomeRecommendationContent {
  readonly content: RecommendationDetailContent;
  readonly showPrepareCoolingReminder: boolean;
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
    items: details.keyActions
      .map((action, index) => ({
        id: action.id,
        image: action.image,
        label: labels[index] ?? "",
      }))
      .filter((item) => item.label !== ""),
    description: toString(translate(details.detailedDescriptionKey)),
    suggestions: toStringArray(
      translate(details.detailedSuggestionsKey, {
        returnObjects: true,
      }),
    ),
  };
}

/**
 * Applies Active Cooling personalisation to Home content only.
 * Shared recommendation content remains complete for the detailed page.
 */
export function personaliseHomeRecommendationContent(
  content: RecommendationDetailContent,
  resolution: ActiveCoolingResolution,
): PersonalisedHomeRecommendationContent {
  if (content.level !== "high") {
    return {
      content,
      showPrepareCoolingReminder: resolution.showPrepareReminder,
    };
  }

  const visibleMethodIds = new Set(resolution.visibleMethodIds);
  const suggestions = content.suggestions.filter((_suggestion, index) => {
    const methodId = ACTIVE_COOLING_METHOD_IDS[index];

    return methodId !== undefined && visibleMethodIds.has(methodId);
  });

  return {
    content: {
      ...content,
      suggestions,
    },
    showPrepareCoolingReminder: resolution.showPrepareReminder,
  };
}
