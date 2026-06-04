export interface LocationSuggestion {
  id: string;
  displayLabel: string;
  name: string;
  regionName?: string;
  countryName: string;
  mapboxId?: string;
  countryCode?: string;
  sessionToken?: string;
  latitude?: number;
  longitude?: number;
}
