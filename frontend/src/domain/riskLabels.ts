import {
  getRiskLevelI18nKeys,
  RISK_LEVELS,
  type RiskLevel,
} from "@/domain/riskRegistry";

export type RiskLevelLabels = Record<RiskLevel, string>;

export type RiskLabelVariant = "long" | "short";

/**
 * Builds translated risk labels from registry i18n keys.
 */
export function createRiskLevelLabels(
  translate: (key: string) => string,
  variant: RiskLabelVariant,
): RiskLevelLabels {
  return RISK_LEVELS.reduce<RiskLevelLabels>((labels, level) => {
    const keys = getRiskLevelI18nKeys(level);

    labels[level] = translate(
      variant === "short" ? keys.levelShortKey : keys.levelKey,
    );

    return labels;
  }, {} as RiskLevelLabels);
}
