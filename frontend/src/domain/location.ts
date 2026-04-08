export type LocationSource = "mapbox";
export type LocationFeatureType =
  | "country"
  | "region"
  | "postcode"
  | "district"
  | "place"
  | "city"
  | "locality"
  | "neighborhood"
  | "street"
  | "address"
  | "poi"
  | "category";

export interface LocationSuggestion {
  id: string;
  label: string;
  formattedLocation: string;
  source: LocationSource;
  featureType?: LocationFeatureType;
  primaryName?: string;
  primaryNameNormalized?: string;
  placeNameNormalized?: string;
  localityNameNormalized?: string;
  mapboxId?: string;
  latitude?: number;
  longitude?: number;
  countryCode?: string;
  region?: string;
  sessionToken?: string;
}
