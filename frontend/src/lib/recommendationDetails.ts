import {
  ACTIVE_COOLING_METHOD_IDS,
  type ActiveCoolingMethodId,
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
  /** Keyed Active Cooling copy used for Home filtering. */
  suggestionsByMethodId?: Readonly<
    Partial<Record<ActiveCoolingMethodId, string>>
  >;
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

function toStringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return toStringArray(value);
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  return Object.values(value).filter(
    (item): item is string => typeof item === "string",
  );
}

function toCompleteActiveCoolingSuggestionMap(
  value: unknown,
): Readonly<Partial<Record<ActiveCoolingMethodId, string>>> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const result: Partial<Record<ActiveCoolingMethodId, string>> = {};

  for (const methodId of ACTIVE_COOLING_METHOD_IDS) {
    const text = record[methodId];
    if (typeof text !== "string" || text === "") {
      return undefined;
    }
    result[methodId] = text;
  }

  return result;
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
  const translatedSuggestions = translate(details.detailedSuggestionsKey, {
    returnObjects: true,
  });
  const suggestionsByMethodId =
    level === "high"
      ? toCompleteActiveCoolingSuggestionMap(translatedSuggestions)
      : undefined;

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
    suggestions: toStringValues(suggestionsByMethodId ?? translatedSuggestions),
    suggestionsByMethodId,
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

  const suggestionsByMethodId = content.suggestionsByMethodId;

  // A malformed or stale translation contract should leave Home advice
  // complete rather than hide a method using an unsafe positional fallback.
  if (
    !suggestionsByMethodId ||
    !ACTIVE_COOLING_METHOD_IDS.every(
      (methodId) => typeof suggestionsByMethodId[methodId] === "string",
    )
  ) {
    return {
      content,
      showPrepareCoolingReminder: resolution.showPrepareReminder,
    };
  }

  const visibleMethodIds = new Set(resolution.visibleMethodIds);
  const suggestions = ACTIVE_COOLING_METHOD_IDS.flatMap((methodId) => {
    const text = suggestionsByMethodId[methodId];
    return visibleMethodIds.has(methodId) && text !== undefined ? [text] : [];
  });

  return {
    content: {
      ...content,
      suggestions,
    },
    showPrepareCoolingReminder: resolution.showPrepareReminder,
  };
}
