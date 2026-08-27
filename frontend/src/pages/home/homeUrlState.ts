import { parseAsString, parseAsStringEnum } from "nuqs";
import {
  HEAT_RISK_PROFILE_VALUES,
  isHeatRiskProfile,
  type HeatRiskProfile,
} from "@/domain/heatRiskProfile";
import { isSportType, SPORT_TYPE_VALUES, type SportType } from "@/domain/sport";

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

export interface ParsedHomeSearchParams {
  profile: HeatRiskProfile | null;
  sport: SportType | null;
  location: string | null;
}

/**
 * Parses Home URL search params directly from the browser location string.
 */
export function parseHomeSearchParams(search: string): ParsedHomeSearchParams {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const profileValue = params.get("profile");
  const sportValue = params.get("sport");
  const locationValue = params.get(HOME_QUERY_URL_KEYS.location);

  return {
    profile:
      profileValue && isHeatRiskProfile(profileValue) ? profileValue : null,
    sport: sportValue && isSportType(sportValue) ? sportValue : null,
    location: locationValue,
  };
}

/**
 * Returns whether the search string includes any Home filter query params.
 */
export function hasHomeSearchParams(search: string): boolean {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  return (
    params.has("profile") ||
    params.has("sport") ||
    params.has(HOME_QUERY_URL_KEYS.location)
  );
}
