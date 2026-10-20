import { RISK_LEVELS, type RiskLevel } from "@/domain/riskRegistry";

const DETAILED_RECOMMENDATIONS_PATH = "/detailed-recommendations";
const RECOMMENDATION_LEVEL_QUERY_PARAM = "level";

export function getDetailedRecommendationsPath(level: RiskLevel): string {
  const params = new URLSearchParams({
    [RECOMMENDATION_LEVEL_QUERY_PARAM]: level,
  });

  return `${DETAILED_RECOMMENDATIONS_PATH}?${params.toString()}`;
}

export function parseRecommendationLevelParam(
  level: string | null,
): RiskLevel | undefined {
  if (level === null) {
    return undefined;
  }

  return RISK_LEVELS.includes(level as RiskLevel)
    ? (level as RiskLevel)
    : undefined;
}
