import type {
  LocationFeatureType,
  LocationSuggestion,
} from "@/domain/location";

const PRIMARY_PLACE_FEATURE_TYPES = [
  "place",
  "city",
  "locality",
  "neighborhood",
  "postcode",
  "region",
  "district",
] as const satisfies readonly LocationFeatureType[];
const PRIMARY_ADDRESS_FEATURE_TYPES = [
  ...PRIMARY_PLACE_FEATURE_TYPES,
  "address",
  "street",
] as const satisfies readonly LocationFeatureType[];
const FALLBACK_FEATURE_TYPES = [
  ...PRIMARY_ADDRESS_FEATURE_TYPES,
  "poi",
] as const satisfies readonly LocationFeatureType[];
const PLACE_FEATURE_TYPES = new Set<LocationFeatureType>(
  PRIMARY_PLACE_FEATURE_TYPES,
);
const ADDRESS_FEATURE_TYPES = new Set<LocationFeatureType>([
  "address",
  "street",
]);
const POI_FEATURE_TYPES = new Set<LocationFeatureType>(["poi", "category"]);
const STREET_SUFFIX_TOKENS = [
  "st",
  "street",
  "rd",
  "road",
  "ave",
  "avenue",
  "dr",
  "drive",
  "ln",
  "lane",
  "ct",
  "court",
  "pl",
  "place",
  "pde",
  "parade",
  "ter",
  "terrace",
  "cres",
  "crescent",
  "hwy",
  "highway",
];
const DEFAULT_VISIBLE_SUGGESTION_LIMIT = 3;
const ADDRESS_LEADING_NUMBER_PATTERN =
  /^\d+[a-z]?(?:\s*[-/]\s*\d+[a-z]?)?(?:\s|,|$)/i;
const ADDRESS_SEPARATOR_PATTERN = /[#/\\]/;
const STREET_SUFFIX_PATTERN = new RegExp(
  `\\b(?:${STREET_SUFFIX_TOKENS.join("|")})\\b$`,
  "i",
);

export interface LocationSuggestRequestPlan {
  queryNormalized: string;
  isAddressLike: boolean;
  primaryTypes: string;
  fallbackTypes: string | null;
}

export interface PreparedLocationSuggestions {
  rankedSuggestions: LocationSuggestion[];
  visibleSuggestions: LocationSuggestion[];
}

type LocationPrefillSource = "url" | "persisted" | "default" | "none";

interface RankedSuggestion {
  suggestion: LocationSuggestion;
  index: number;
  bucket: number;
}

function toNormalizedCountryCode(countryCode?: string): string {
  return countryCode?.trim().toLowerCase() ?? "";
}

function toNormalizedFormattedLocation(suggestion: LocationSuggestion): string {
  return normalizeLocationSearchText(suggestion.formattedLocation);
}

function toPrimaryNameNormalized(suggestion: LocationSuggestion): string {
  return (
    suggestion.primaryNameNormalized ??
    normalizeLocationSearchText(
      suggestion.primaryName ??
        suggestion.label ??
        suggestion.formattedLocation,
    )
  );
}

function toPlaceNameNormalized(suggestion: LocationSuggestion): string {
  return suggestion.placeNameNormalized ?? "";
}

function toLocalityNameNormalized(suggestion: LocationSuggestion): string {
  return suggestion.localityNameNormalized ?? "";
}

function toPlaceCollapseKey(suggestion: LocationSuggestion): string {
  return [
    toPrimaryNameNormalized(suggestion),
    toPlaceNameNormalized(suggestion),
    toLocalityNameNormalized(suggestion),
    toNormalizedCountryCode(suggestion.countryCode),
  ].join("|");
}

function getPlaceMatchBucket(
  suggestion: LocationSuggestion,
  normalizedQuery: string,
): number {
  const primaryNameNormalized = toPrimaryNameNormalized(suggestion);

  if (!normalizedQuery) {
    return 2;
  }

  if (primaryNameNormalized === normalizedQuery) {
    return 0;
  }

  if (
    primaryNameNormalized.startsWith(normalizedQuery) ||
    normalizedQuery.startsWith(primaryNameNormalized)
  ) {
    return 1;
  }

  return 2;
}

function isExactPlaceLikeMatch(
  suggestion: LocationSuggestion,
  normalizedQuery: string,
): boolean {
  return (
    isPlaceLikeFeatureType(suggestion.featureType) &&
    toPrimaryNameNormalized(suggestion) === normalizedQuery
  );
}

function isStrongPlaceLikeMatch(
  suggestion: LocationSuggestion,
  normalizedQuery: string,
): boolean {
  return (
    isPlaceLikeFeatureType(suggestion.featureType) &&
    getPlaceMatchBucket(suggestion, normalizedQuery) <= 1
  );
}

function getSuggestionBucket(
  suggestion: LocationSuggestion,
  normalizedQuery: string,
): number {
  if (isPlaceLikeFeatureType(suggestion.featureType)) {
    return getPlaceMatchBucket(suggestion, normalizedQuery);
  }

  if (isAddressFeatureType(suggestion.featureType)) {
    return 3;
  }

  if (isPoiFeatureType(suggestion.featureType)) {
    return 4;
  }

  return 5;
}

function rankLocationSuggestions(
  suggestions: LocationSuggestion[],
  normalizedQuery: string,
): LocationSuggestion[] {
  const ranked = suggestions
    .map<RankedSuggestion>((suggestion, index) => ({
      suggestion,
      index,
      bucket: getSuggestionBucket(suggestion, normalizedQuery),
    }))
    .sort((left, right) =>
      left.bucket === right.bucket
        ? left.index - right.index
        : left.bucket - right.bucket,
    );

  return ranked.map(({ suggestion }) => suggestion);
}

function collapseVisibleLocationSuggestions(
  suggestions: LocationSuggestion[],
): LocationSuggestion[] {
  const seenPlaceKeys = new Set<string>();
  const seenOtherLabels = new Set<string>();

  return suggestions.filter((suggestion) => {
    if (isPlaceLikeFeatureType(suggestion.featureType)) {
      const key = toPlaceCollapseKey(suggestion);
      if (!key || seenPlaceKeys.has(key)) {
        return false;
      }

      seenPlaceKeys.add(key);
      return true;
    }

    const labelKey = toNormalizedFormattedLocation(suggestion);
    if (!labelKey || seenOtherLabels.has(labelKey)) {
      return false;
    }

    seenOtherLabels.add(labelKey);
    return true;
  });
}

function isSamePlaceContext(
  topSuggestion: LocationSuggestion,
  candidate: LocationSuggestion,
): boolean {
  const topCountry = toNormalizedCountryCode(topSuggestion.countryCode);
  const candidateCountry = toNormalizedCountryCode(candidate.countryCode);

  if (topCountry && candidateCountry && topCountry !== candidateCountry) {
    return false;
  }

  if (isPlaceLikeFeatureType(candidate.featureType)) {
    return toPlaceCollapseKey(topSuggestion) === toPlaceCollapseKey(candidate);
  }

  const topPrimaryName = toPrimaryNameNormalized(topSuggestion);
  if (!topPrimaryName) {
    return false;
  }

  return (
    toPrimaryNameNormalized(candidate).includes(topPrimaryName) ||
    toPlaceNameNormalized(candidate) === topPrimaryName ||
    toLocalityNameNormalized(candidate) === topPrimaryName ||
    toNormalizedFormattedLocation(candidate).includes(topPrimaryName)
  );
}

function shouldCollapseToSingleExactPlace(
  suggestions: LocationSuggestion[],
  normalizedQuery: string,
): boolean {
  const [topSuggestion, ...rest] = suggestions;
  if (!topSuggestion) {
    return false;
  }

  if (!isExactPlaceLikeMatch(topSuggestion, normalizedQuery)) {
    return false;
  }

  if (rest.length === 0) {
    return true;
  }

  return rest.every((suggestion) =>
    isSamePlaceContext(topSuggestion, suggestion),
  );
}

export function normalizeLocationSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ");
}

export function isPlaceLikeFeatureType(
  featureType?: LocationFeatureType,
): boolean {
  return featureType !== undefined && PLACE_FEATURE_TYPES.has(featureType);
}

export function isAddressFeatureType(
  featureType?: LocationFeatureType,
): boolean {
  return featureType !== undefined && ADDRESS_FEATURE_TYPES.has(featureType);
}

export function isPoiFeatureType(featureType?: LocationFeatureType): boolean {
  return featureType !== undefined && POI_FEATURE_TYPES.has(featureType);
}

export function isAddressLikeLocationQuery(query: string): boolean {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return false;
  }

  if (ADDRESS_LEADING_NUMBER_PATTERN.test(trimmedQuery)) {
    return true;
  }

  if (ADDRESS_SEPARATOR_PATTERN.test(trimmedQuery)) {
    return true;
  }

  return STREET_SUFFIX_PATTERN.test(normalizeLocationSearchText(trimmedQuery));
}

export function createLocationSuggestRequestPlan(
  query: string,
): LocationSuggestRequestPlan {
  const isAddressLike = isAddressLikeLocationQuery(query);

  return {
    queryNormalized: normalizeLocationSearchText(query),
    isAddressLike,
    primaryTypes: (isAddressLike
      ? PRIMARY_ADDRESS_FEATURE_TYPES
      : PRIMARY_PLACE_FEATURE_TYPES
    ).join(","),
    fallbackTypes: isAddressLike ? null : FALLBACK_FEATURE_TYPES.join(","),
  };
}

export function shouldFallbackToExpandedSuggest(params: {
  queryNormalized: string;
  isAddressLike: boolean;
  suggestions: LocationSuggestion[];
}): boolean {
  const { queryNormalized, isAddressLike, suggestions } = params;

  if (isAddressLike) {
    return false;
  }

  return !suggestions.some((suggestion) =>
    isStrongPlaceLikeMatch(suggestion, queryNormalized),
  );
}

export function prepareLocationSuggestions(params: {
  query: string;
  suggestions: LocationSuggestion[];
  visibleLimit?: number;
}): PreparedLocationSuggestions {
  const {
    query,
    suggestions,
    visibleLimit = DEFAULT_VISIBLE_SUGGESTION_LIMIT,
  } = params;
  const normalizedQuery = normalizeLocationSearchText(query);
  const rankedSuggestions = rankLocationSuggestions(
    suggestions,
    normalizedQuery,
  );
  const collapsedVisibleSuggestions =
    collapseVisibleLocationSuggestions(rankedSuggestions);
  const limitedVisibleSuggestions = collapsedVisibleSuggestions.slice(
    0,
    visibleLimit,
  );

  return {
    rankedSuggestions,
    visibleSuggestions: shouldCollapseToSingleExactPlace(
      limitedVisibleSuggestions,
      normalizedQuery,
    )
      ? limitedVisibleSuggestions.slice(0, 1)
      : limitedVisibleSuggestions,
  };
}

export function findExactNormalizedSuggestion(
  suggestions: LocationSuggestion[],
  value: string,
): LocationSuggestion | null {
  const normalizedValue = normalizeLocationSearchText(value);
  if (!normalizedValue) {
    return null;
  }

  return (
    suggestions.find(
      (suggestion) =>
        normalizeLocationSearchText(suggestion.formattedLocation) ===
        normalizedValue,
    ) ?? null
  );
}

export function resolvePrefilledLocationSuggestion(params: {
  suggestions: LocationSuggestion[];
  value: string;
  prefillSource: LocationPrefillSource;
}): LocationSuggestion | null {
  const { suggestions, value, prefillSource } = params;

  return (
    findExactNormalizedSuggestion(suggestions, value) ??
    (prefillSource === "default" ? (suggestions[0] ?? null) : null)
  );
}
