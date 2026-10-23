import {
  MAX_DASHBOARD_CARDS,
  type DashboardCardSchedule,
  type SavedDashboardCard,
  validateDashboardCardSchedule,
} from "@/domain/dashboard";
import {
  createDefaultDashboardOtherPeriodDraft,
  isRestorableDashboardOtherPeriodDraft,
  type DashboardOtherPeriodDraft,
} from "@/domain/dashboardOtherPeriod";
import {
  DEFAULT_DASHBOARD_VIEW_MODE,
  parseDashboardViewMode,
  type DashboardViewMode,
} from "@/domain/dashboardViewMode";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";
import { isValidPersistedSport } from "@/pages/home/browserState";

const DASHBOARD_STORAGE_KEY = "dashboard-cards:v1";
const DASHBOARD_VIEW_MODE_STORAGE_KEY = "dashboard-view-mode:v1";
const DASHBOARD_OTHER_PERIOD_STORAGE_KEY = "dashboard-other-period:v1";

export interface PersistedDashboardState {
  cards: SavedDashboardCard[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDashboardCardSchedule(
  value: unknown,
): value is DashboardCardSchedule {
  if (
    !isRecord(value) ||
    !Array.isArray(value.weekdays) ||
    typeof value.startMinutes !== "number" ||
    typeof value.endMinutes !== "number"
  ) {
    return false;
  }

  return (
    validateDashboardCardSchedule(value as unknown as DashboardCardSchedule) ===
    null
  );
}

function isValidSavedDashboardCard(
  value: unknown,
  allowedSports: readonly SportType[],
): value is SavedDashboardCard {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isValidPersistedSport(value.sport, allowedSports) &&
    typeof value.displayLabel === "string" &&
    value.displayLabel.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.countryName === "string" &&
    value.countryName.length > 0 &&
    typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    (value.regionName === undefined || typeof value.regionName === "string") &&
    (value.mapboxId === undefined || typeof value.mapboxId === "string") &&
    (value.schedule === undefined || isDashboardCardSchedule(value.schedule))
  );
}

/**
 * Loads and validates persisted dashboard state from localStorage.
 */
export function loadPersistedDashboardState(
  allowedSports: readonly SportType[],
): PersistedDashboardState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const cards = parsed.cards;

    if (!Array.isArray(cards)) {
      return null;
    }

    const validCards = cards.filter((card): card is SavedDashboardCard =>
      isValidSavedDashboardCard(card, allowedSports),
    );
    const discardedCount = cards.length - validCards.length;
    if (discardedCount > 0) {
      console.warn(
        `Dropped ${discardedCount} invalid dashboard ${
          discardedCount === 1 ? "card" : "cards"
        } from localStorage.`,
      );
    }

    return {
      cards: validCards.slice(0, MAX_DASHBOARD_CARDS),
    };
  } catch {
    return null;
  }
}

/**
 * Persists the latest dashboard card list into localStorage (best-effort).
 */
export function savePersistedDashboardState(
  state: PersistedDashboardState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: PersistedDashboardState = {
      cards: state.cards,
    };

    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}

/**
 * Resolves the initial saved cards list from persisted state.
 */
export function resolveInitialDashboardCards(
  persistedState: PersistedDashboardState | null,
): SavedDashboardCard[] {
  return persistedState?.cards ?? [];
}

/**
 * Resolves the initial draft sport from persisted cards or app defaults.
 */
export function resolveInitialDashboardDraftSport(
  persistedState: PersistedDashboardState | null,
): SportType {
  return persistedState?.cards[0]?.sport ?? DEFAULT_SPORT_TYPE;
}

/**
 * Loads the persisted dashboard view mode, falling back to the default.
 */
export function loadPersistedDashboardViewMode(): DashboardViewMode {
  if (typeof window === "undefined") {
    return DEFAULT_DASHBOARD_VIEW_MODE;
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_VIEW_MODE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DASHBOARD_VIEW_MODE;
    }

    return parseDashboardViewMode(raw) ?? DEFAULT_DASHBOARD_VIEW_MODE;
  } catch {
    return DEFAULT_DASHBOARD_VIEW_MODE;
  }
}

/**
 * Persists the selected dashboard view mode into localStorage (best-effort).
 */
export function savePersistedDashboardViewMode(
  viewMode: DashboardViewMode,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DASHBOARD_VIEW_MODE_STORAGE_KEY, viewMode);
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}

function isDashboardOtherPeriodDraft(
  value: unknown,
): value is DashboardOtherPeriodDraft {
  if (!isRecord(value)) {
    return false;
  }

  const weekday = value.weekday;
  const hasValidWeekday =
    weekday === null ||
    (typeof weekday === "number" &&
      Number.isInteger(weekday) &&
      weekday >= 0 &&
      weekday <= 6);

  return (
    hasValidWeekday &&
    (value.startMinutes === null ||
      (typeof value.startMinutes === "number" &&
        Number.isFinite(value.startMinutes))) &&
    (value.endMinutes === null ||
      (typeof value.endMinutes === "number" &&
        Number.isFinite(value.endMinutes)))
  );
}

/**
 * Loads the persisted other-period picker draft, falling back to defaults.
 */
export function loadPersistedDashboardOtherPeriodDraft(): DashboardOtherPeriodDraft {
  if (typeof window === "undefined") {
    return createDefaultDashboardOtherPeriodDraft();
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_OTHER_PERIOD_STORAGE_KEY);
    if (!raw) {
      return createDefaultDashboardOtherPeriodDraft();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (
      !isDashboardOtherPeriodDraft(parsed) ||
      !isRestorableDashboardOtherPeriodDraft(parsed)
    ) {
      return createDefaultDashboardOtherPeriodDraft();
    }

    return parsed;
  } catch {
    return createDefaultDashboardOtherPeriodDraft();
  }
}

/**
 * Persists the other-period picker draft into localStorage (best-effort).
 */
export function savePersistedDashboardOtherPeriodDraft(
  draft: DashboardOtherPeriodDraft,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      DASHBOARD_OTHER_PERIOD_STORAGE_KEY,
      JSON.stringify(draft),
    );
  } catch {
    // Intentionally ignore storage errors to keep UI interaction unblocked.
  }
}
