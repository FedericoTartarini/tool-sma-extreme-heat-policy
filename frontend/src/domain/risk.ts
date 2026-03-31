import type { RiskLevel } from "@/domain/riskRegistry";
export type { RiskLevel } from "@/domain/riskRegistry";
export { toRiskLevel } from "@/domain/riskRegistry";

export interface HeatRisk {
  riskLevelInterpolated: number;
  mediumThreshold: number;
  highThreshold: number;
  extremeThreshold: number;
  recommendation: string;
}

export interface ForecastPoint {
  time: string;
  value: number;
}

export interface ForecastDay {
  date: string;
  risk: RiskLevel;
  points: ForecastPoint[];
}
