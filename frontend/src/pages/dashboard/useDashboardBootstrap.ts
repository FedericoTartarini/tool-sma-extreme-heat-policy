import { useEffect, useRef } from "react";
import type { SavedDashboardCard } from "@/domain/dashboard";
import { SPORT_TYPE_VALUES } from "@/domain/sport";
import {
  loadPersistedDashboardState,
  resolveInitialDashboardCards,
  resolveInitialDashboardDraftSport,
  savePersistedDashboardState,
} from "@/pages/dashboard/browserState";
import { useDashboardStore } from "@/store/dashboardStore";

/**
 * Bootstraps dashboard state from localStorage and keeps cards persisted.
 */
export function useDashboardBootstrap(): void {
  const isBootstrapped = useDashboardStore((state) => state.isBootstrapped);
  const bootstrap = useDashboardStore((state) => state.bootstrap);
  const cards = useDashboardStore((state) => state.cards);
  const bootstrappedCardsRef = useRef<SavedDashboardCard[] | null>(null);

  useEffect(() => {
    if (isBootstrapped) {
      return;
    }

    const persistedState = loadPersistedDashboardState(SPORT_TYPE_VALUES);
    const initialCards = resolveInitialDashboardCards(persistedState);
    bootstrappedCardsRef.current = initialCards;
    bootstrap({
      cards: initialCards,
      draftSport: resolveInitialDashboardDraftSport(persistedState),
    });
  }, [bootstrap, isBootstrapped]);

  useEffect(() => {
    // Write only after the cards change, so stored data that could not be read
    // is not replaced with an empty list on load.
    if (!isBootstrapped || cards === bootstrappedCardsRef.current) {
      return;
    }

    savePersistedDashboardState({
      cards,
    });
  }, [cards, isBootstrapped]);
}
