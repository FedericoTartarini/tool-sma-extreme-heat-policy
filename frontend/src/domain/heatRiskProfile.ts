const HEAT_RISK_PROFILE_META = [
  {
    type: "ADULT",
    labelKey: "home.sections.filters.profileAdult",
    sortOrder: 0,
  },
  {
    type: "AGE_14_17",
    labelKey: "home.sections.filters.profileAge14To17",
    sortOrder: 1,
  },
  {
    type: "AGE_10_13",
    labelKey: "home.sections.filters.profileAge10To13",
    sortOrder: 2,
  },
  {
    type: "UNDER_10",
    labelKey: "home.sections.filters.profileUnder10",
    sortOrder: 3,
  },
] as const;

export type HeatRiskProfile = (typeof HEAT_RISK_PROFILE_META)[number]["type"];

export interface HeatRiskProfileMeta {
  type: HeatRiskProfile;
  labelKey: string;
  sortOrder: number;
}

export const heatRiskProfiles: readonly HeatRiskProfileMeta[] =
  HEAT_RISK_PROFILE_META;

export const HEAT_RISK_PROFILE_VALUES: HeatRiskProfile[] = heatRiskProfiles.map(
  (profile) => profile.type,
);

export const DEFAULT_HEAT_RISK_PROFILE: HeatRiskProfile = "ADULT";

export function isHeatRiskProfile(value: unknown): value is HeatRiskProfile {
  return (
    typeof value === "string" &&
    HEAT_RISK_PROFILE_VALUES.includes(value as HeatRiskProfile)
  );
}
