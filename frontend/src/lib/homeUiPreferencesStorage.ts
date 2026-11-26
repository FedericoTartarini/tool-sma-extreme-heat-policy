export interface HomeUiPreferences {
  showWeatherDetails: boolean;
}

const HOME_UI_PREFERENCES_STORAGE_KEY = "home-ui-preferences:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Loads persisted Home UI preferences from localStorage.
 */
export function loadPersistedHomeUiPreferences(): Partial<HomeUiPreferences> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(HOME_UI_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }

    const preferences: Partial<HomeUiPreferences> = {};

    if (typeof parsed.showWeatherDetails === "boolean") {
      preferences.showWeatherDetails = parsed.showWeatherDetails;
    }

    return preferences;
  } catch {
    return {};
  }
}

/**
 * Persists Home UI preferences into localStorage (best-effort).
 */
export function savePersistedHomeUiPreferences(
  preferences: HomeUiPreferences,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      HOME_UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}
