import { create } from "zustand";
import type { LocationSuggestion } from "@/domain/location";
import { isStartingNewLocationSearch } from "@/domain/locationSearch";
import {
  createSavedDashboardCardFromSuggestion,
  type AddDashboardCardResult,
  type DashboardCardSchedule,
  type SavedDashboardCard,
  type UpdateDashboardCardScheduleResult,
  validateAddSavedDashboardCard,
  validateUpdateSavedDashboardCardSchedule,
} from "@/domain/dashboard";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";
import type { DashboardOtherPeriodDraft } from "@/domain/dashboardOtherPeriod";
import {
  DEFAULT_DASHBOARD_VIEW_MODE,
  type DashboardViewMode,
} from "@/domain/dashboardViewMode";
import {
  loadPersistedDashboardOtherPeriodDraft,
  loadPersistedDashboardViewMode,
  savePersistedDashboardOtherPeriodDraft,
  savePersistedDashboardViewMode,
} from "@/pages/dashboard/browserState";

export interface DashboardStoreBootstrapPayload {
  cards: SavedDashboardCard[];
  draftSport?: SportType;
  viewMode?: DashboardViewMode;
  otherPeriodDraft?: DashboardOtherPeriodDraft;
}

interface DashboardStoreState {
  isBootstrapped: boolean;
  viewMode: DashboardViewMode;
  otherPeriodDraft: DashboardOtherPeriodDraft;
  draftSport: SportType;
  draftLocation: LocationSuggestion | null;
  cards: SavedDashboardCard[];
  locationSearchInput: string;
  locationSessionToken: string;

  bootstrap: (payload: DashboardStoreBootstrapPayload) => void;
  setViewMode: (viewMode: DashboardViewMode) => void;
  setOtherPeriodWeekday: (
    weekday: DashboardOtherPeriodDraft["weekday"],
  ) => void;
  setOtherPeriodStartMinutes: (startMinutes: number | null) => void;
  setOtherPeriodEndMinutes: (endMinutes: number | null) => void;
  setDraftSport: (sport: SportType) => void;
  setDraftLocation: (suggestion: LocationSuggestion | null) => void;
  setLocationSearchInput: (value: string) => void;
  addCard: (
    sport: SportType,
    suggestion: LocationSuggestion,
    schedule: DashboardCardSchedule,
  ) => AddDashboardCardResult;
  removeCard: (cardId: string) => void;
  updateCardSchedule: (
    cardId: string,
    schedule: DashboardCardSchedule,
  ) => UpdateDashboardCardScheduleResult;
  moveCardUp: (cardId: string) => void;
  moveCardDown: (cardId: string) => void;
}

function createSessionToken(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function reorderCards(
  cards: SavedDashboardCard[],
  cardId: string,
  direction: -1 | 1,
): SavedDashboardCard[] {
  const currentIndex = cards.findIndex((card) => card.id === cardId);

  if (currentIndex === -1) {
    return cards;
  }

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= cards.length) {
    return cards;
  }

  const nextCards = [...cards];
  const [movedCard] = nextCards.splice(currentIndex, 1);
  nextCards.splice(targetIndex, 0, movedCard);
  return nextCards;
}

/**
 * Central dashboard store for saved cards and add-location UI state.
 */
export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  isBootstrapped: false,
  viewMode: DEFAULT_DASHBOARD_VIEW_MODE,
  otherPeriodDraft: loadPersistedDashboardOtherPeriodDraft(),
  draftSport: DEFAULT_SPORT_TYPE,
  draftLocation: null,
  cards: [],
  locationSearchInput: "",
  locationSessionToken: createSessionToken(),

  bootstrap: ({ cards, draftSport, viewMode, otherPeriodDraft }) => {
    set({
      isBootstrapped: true,
      cards,
      draftSport: draftSport ?? DEFAULT_SPORT_TYPE,
      draftLocation: null,
      locationSearchInput: "",
      locationSessionToken: createSessionToken(),
      viewMode: viewMode ?? loadPersistedDashboardViewMode(),
      otherPeriodDraft:
        otherPeriodDraft ?? loadPersistedDashboardOtherPeriodDraft(),
    });
  },

  setViewMode: (viewMode) => {
    set({ viewMode });
    savePersistedDashboardViewMode(viewMode);
  },

  setOtherPeriodWeekday: (weekday) => {
    const otherPeriodDraft = { ...get().otherPeriodDraft, weekday };
    set({ otherPeriodDraft });
    savePersistedDashboardOtherPeriodDraft(otherPeriodDraft);
  },

  setOtherPeriodStartMinutes: (startMinutes) => {
    const otherPeriodDraft = { ...get().otherPeriodDraft, startMinutes };
    set({ otherPeriodDraft });
    savePersistedDashboardOtherPeriodDraft(otherPeriodDraft);
  },

  setOtherPeriodEndMinutes: (endMinutes) => {
    const otherPeriodDraft = { ...get().otherPeriodDraft, endMinutes };
    set({ otherPeriodDraft });
    savePersistedDashboardOtherPeriodDraft(otherPeriodDraft);
  },

  setDraftSport: (sport) => {
    set({ draftSport: sport });
  },

  setDraftLocation: (suggestion) => {
    set({
      draftLocation: suggestion,
      locationSearchInput: suggestion?.displayLabel ?? "",
    });
  },

  setLocationSearchInput: (value) => {
    const draftLocation = get().draftLocation;
    const shouldRefreshSessionToken = isStartingNewLocationSearch({
      previousInput: get().locationSearchInput,
      nextInput: value,
      selectedLabel: draftLocation?.displayLabel ?? null,
    });
    const shouldKeepDraftLocation =
      draftLocation !== null &&
      value.trim() === draftLocation.displayLabel.trim();

    set((state) => ({
      locationSearchInput: value,
      draftLocation: shouldKeepDraftLocation ? draftLocation : null,
      locationSessionToken: shouldRefreshSessionToken
        ? createSessionToken()
        : state.locationSessionToken,
    }));
  },

  addCard: (sport, suggestion, schedule) => {
    const validation = validateAddSavedDashboardCard(
      get().cards,
      sport,
      suggestion,
      schedule,
    );
    if (!validation.ok) {
      return validation;
    }

    const savedCard = createSavedDashboardCardFromSuggestion(
      sport,
      {
        ...suggestion,
        latitude: suggestion.latitude as number,
        longitude: suggestion.longitude as number,
      },
      schedule,
    );

    set((state) => ({
      cards: [...state.cards, savedCard],
      locationSearchInput: "",
      draftLocation: null,
      // The picked place ended the Mapbox session; the next search needs a new one.
      locationSessionToken: createSessionToken(),
    }));

    return { ok: true };
  },

  removeCard: (cardId) => {
    set((state) => ({
      cards: state.cards.filter((card) => card.id !== cardId),
    }));
  },

  updateCardSchedule: (cardId, schedule) => {
    const validation = validateUpdateSavedDashboardCardSchedule(
      get().cards,
      cardId,
      schedule,
    );
    if (!validation.ok) {
      return validation;
    }

    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === cardId ? { ...card, schedule } : card,
      ),
    }));

    return { ok: true };
  },

  moveCardUp: (cardId) => {
    set((state) => ({
      cards: reorderCards(state.cards, cardId, -1),
    }));
  },

  moveCardDown: (cardId) => {
    set((state) => ({
      cards: reorderCards(state.cards, cardId, 1),
    }));
  },
}));
