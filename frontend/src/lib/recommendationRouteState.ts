import { createSerializer, parseAsStringEnum } from "nuqs";
import { RISK_LEVELS, type RiskLevel } from "@/domain/riskRegistry";

export const DETAILED_RECOMMENDATIONS_PATH = "/detailed-recommendations";

export const RECOMMENDATION_QUERY_PARSERS = {
  level: parseAsStringEnum<RiskLevel>([...RISK_LEVELS]),
};

const serializeRecommendationQuery = createSerializer(
  RECOMMENDATION_QUERY_PARSERS,
);

export function getDetailedRecommendationsPath(level: RiskLevel): string {
  return serializeRecommendationQuery(DETAILED_RECOMMENDATIONS_PATH, { level });
}

export function getRecommendationLevelItemId(level: RiskLevel): string {
  return `recommendation-level-${level}`;
}
