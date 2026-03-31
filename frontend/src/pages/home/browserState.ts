import type { SportType } from "@/domain/sport";

const HOME_FILTERS_STORAGE_KEY = "home-filters:v1";

export interface PersistedHomeFilters {
  sport: SportType;
  loc: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validates persisted sport values against allowed sport types.
 */
export function isValidPersistedSport(
  value: unknown,
  allowedSports: readonly SportType[],
): value is SportType {
  return (
    typeof value === "string" && allowedSports.includes(value as SportType)
  );
}

/**
 * Loads and validates persisted Home filters from localStorage.
 */
export function loadPersistedHomeFilters(
  allowedSports: readonly SportType[],
): PersistedHomeFilters | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(HOME_FILTERS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const sport = parsed.sport;
    const loc = parsed.loc;

    if (!isValidPersistedSport(sport, allowedSports)) {
      return null;
    }

    if (typeof loc !== "string") {
      return null;
    }

    const trimmedLoc = loc.trim();
    if (!trimmedLoc) {
      return null;
    }

    return {
      sport,
      loc: trimmedLoc,
    };
  } catch {
    return null;
  }
}

/**
 * Persists the latest Home selection into localStorage (best-effort).
 */
export function savePersistedHomeFilters(filters: PersistedHomeFilters): void {
  if (typeof window === "undefined") {
    return;
  }

  const trimmedLoc = filters.loc.trim();
  if (!trimmedLoc) {
    return;
  }

  try {
    const payload: PersistedHomeFilters = {
      sport: filters.sport,
      loc: trimmedLoc,
    };

    window.localStorage.setItem(
      HOME_FILTERS_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}
