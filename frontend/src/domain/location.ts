export type LocationSource = "mapbox";

export interface LocationSuggestion {
  id: string;
  label: string;
  formattedLocation: string;
  source: LocationSource;
  mapboxId?: string;
  latitude?: number;
  longitude?: number;
  countryCode?: string;
  region?: string;
  sessionToken?: string;
}
