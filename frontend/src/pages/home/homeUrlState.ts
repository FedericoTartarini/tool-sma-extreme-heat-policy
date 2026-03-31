import { parseAsString, parseAsStringEnum } from "nuqs";
import { SPORT_TYPE_VALUES } from "@/domain/sport";

export const VALID_SPORT_VALUES = SPORT_TYPE_VALUES;

export const HOME_QUERY_PARSERS = {
  sport: parseAsStringEnum(VALID_SPORT_VALUES),
  location: parseAsString,
};

export const HOME_QUERY_URL_KEYS = {
  location: "loc",
} as const;
