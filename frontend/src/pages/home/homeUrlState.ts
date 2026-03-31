import { parseAsString, parseAsStringEnum } from "nuqs";
import {
  HEAT_RISK_PROFILE_VALUES,
  type HeatRiskProfile,
} from "@/domain/heatRiskProfile";
import { SPORT_TYPE_VALUES } from "@/domain/sport";

export const VALID_PROFILE_VALUES: HeatRiskProfile[] = [
  ...HEAT_RISK_PROFILE_VALUES,
];
export const VALID_SPORT_VALUES = SPORT_TYPE_VALUES;

export const HOME_QUERY_PARSERS = {
  profile: parseAsStringEnum<HeatRiskProfile>(VALID_PROFILE_VALUES),
  sport: parseAsStringEnum(VALID_SPORT_VALUES),
  location: parseAsString,
};

export const HOME_QUERY_URL_KEYS = {
  location: "loc",
} as const;
