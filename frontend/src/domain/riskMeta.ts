import {
  getRiskColor as getRiskColorFromRegistry,
  RISK_LEVELS,
  RISK_REGISTRY,
  toRiskLevel as toRiskLevelFromRegistry,
  type RiskLevel,
} from "@/domain/riskRegistry";
import type { ResponsiveImageAsset } from "@/lib/responsiveImage";

export type { RiskLevel } from "@/domain/riskRegistry";
export { RISK_LEVELS } from "@/domain/riskRegistry";

interface LegacyRiskMetaEntry {
  color: string;
  scoreUpperExclusive: number;
  keyIconAssets: ResponsiveImageAsset[];
  i18nLevelKey: string;
  i18nLevelShortKey: string;
}

export const RISK_LEVEL_META: Record<RiskLevel, LegacyRiskMetaEntry> =
  RISK_LEVELS.reduce<Record<RiskLevel, LegacyRiskMetaEntry>>(
    (meta, level) => {
      const registryEntry = RISK_REGISTRY[level];

      meta[level] = {
        color: registryEntry.color,
        scoreUpperExclusive: registryEntry.scoreUpperExclusive,
        keyIconAssets: registryEntry.keyIconAssets,
        i18nLevelKey: registryEntry.levelKey,
        i18nLevelShortKey: registryEntry.levelShortKey,
      };

      return meta;
    },
    {} as Record<RiskLevel, LegacyRiskMetaEntry>,
  );

/**
 * Converts an interpolated risk score into a discrete risk level.
 */
export function toRiskLevel(score: number): RiskLevel {
  return toRiskLevelFromRegistry(score);
}

/**
 * Returns the configured color for a risk level.
 */
export function getRiskColor(level: RiskLevel): string {
  return getRiskColorFromRegistry(level);
}
