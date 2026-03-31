import { getReadableTextColor } from "@/lib/colorContrast";
import { RECOMMENDATION_ACTION_ASSETS } from "@/domain/recommendationActionAssets";

export type RiskLevel = "low" | "moderate" | "high" | "extreme";

export interface RiskRegistryEntry {
  scoreLowerInclusive: number;
  scoreUpperExclusive: number;
  color: string;
  keyIconPaths: string[];
  levelKey: string;
  levelShortKey: string;
  keyRecommendationsKey: string;
  detailedDescriptionKey: string;
  detailedSuggestionsKey: string;
}

export interface RiskBand {
  level: RiskLevel;
  lower: number;
  upper: number;
  color: string;
}

export const RISK_LEVELS: readonly RiskLevel[] = [
  "low",
  "moderate",
  "high",
  "extreme",
];
export const MAX_RISK_SCORE = 4;

export const RISK_REGISTRY: Record<RiskLevel, RiskRegistryEntry> = {
  low: {
    scoreLowerInclusive: 0,
    scoreUpperExclusive: 1,
    color: "#FFE478",
    keyIconPaths: [
      RECOMMENDATION_ACTION_ASSETS.hydration,
      RECOMMENDATION_ACTION_ASSETS.clothing,
    ],
    levelKey: "risk.level.low",
    levelShortKey: "risk.levelShort.low",
    keyRecommendationsKey: "recommendations.key.low",
    detailedDescriptionKey: "recommendations.detailed.low.description",
    detailedSuggestionsKey: "recommendations.detailed.low.suggestions",
  },
  moderate: {
    scoreLowerInclusive: 1,
    scoreUpperExclusive: 2,
    color: "#F5810C",
    keyIconPaths: [
      RECOMMENDATION_ACTION_ASSETS.hydration,
      RECOMMENDATION_ACTION_ASSETS.clothing,
      RECOMMENDATION_ACTION_ASSETS.pause,
    ],
    levelKey: "risk.level.moderate",
    levelShortKey: "risk.levelShort.moderate",
    keyRecommendationsKey: "recommendations.key.moderate",
    detailedDescriptionKey: "recommendations.detailed.moderate.description",
    detailedSuggestionsKey: "recommendations.detailed.moderate.suggestions",
  },
  high: {
    scoreLowerInclusive: 2,
    scoreUpperExclusive: 3,
    color: "#CF3838",
    keyIconPaths: [
      RECOMMENDATION_ACTION_ASSETS.hydration,
      RECOMMENDATION_ACTION_ASSETS.clothing,
      RECOMMENDATION_ACTION_ASSETS.pause,
      RECOMMENDATION_ACTION_ASSETS.cooling,
    ],
    levelKey: "risk.level.high",
    levelShortKey: "risk.levelShort.high",
    keyRecommendationsKey: "recommendations.key.high",
    detailedDescriptionKey: "recommendations.detailed.high.description",
    detailedSuggestionsKey: "recommendations.detailed.high.suggestions",
  },
  extreme: {
    scoreLowerInclusive: 3,
    scoreUpperExclusive: Number.POSITIVE_INFINITY,
    color: "#8C2439",
    keyIconPaths: [RECOMMENDATION_ACTION_ASSETS.stop],
    levelKey: "risk.level.extreme",
    levelShortKey: "risk.levelShort.extreme",
    keyRecommendationsKey: "recommendations.key.extreme",
    detailedDescriptionKey: "recommendations.detailed.extreme.description",
    detailedSuggestionsKey: "recommendations.detailed.extreme.suggestions",
  },
};

/**
 * Converts an interpolated risk score (0-4) into a discrete risk level.
 */
export function toRiskLevel(score: number): RiskLevel {
  const safeScore = Number.isFinite(score) ? score : 0;

  for (const level of RISK_LEVELS) {
    if (safeScore < RISK_REGISTRY[level].scoreUpperExclusive) {
      return level;
    }
  }

  return "extreme";
}

/**
 * Returns the configured color for a risk level.
 */
export function getRiskColor(level: RiskLevel): string {
  return RISK_REGISTRY[level].color;
}

/**
 * Returns the foreground color to use for risk badges.
 */
export function getRiskBadgeForegroundColor(level: RiskLevel): string {
  return getReadableTextColor(getRiskColor(level));
}

/**
 * Returns long and short i18n keys for a risk level.
 */
export function getRiskLevelI18nKeys(level: RiskLevel): {
  levelKey: string;
  levelShortKey: string;
} {
  return {
    levelKey: RISK_REGISTRY[level].levelKey,
    levelShortKey: RISK_REGISTRY[level].levelShortKey,
  };
}

/**
 * Returns chart-friendly risk bands in display order.
 */
export function getRiskBands(): RiskBand[] {
  return RISK_LEVELS.map((level) => ({
    level,
    lower: RISK_REGISTRY[level].scoreLowerInclusive,
    upper:
      level === "extreme"
        ? MAX_RISK_SCORE
        : RISK_REGISTRY[level].scoreUpperExclusive,
    color: RISK_REGISTRY[level].color,
  }));
}
