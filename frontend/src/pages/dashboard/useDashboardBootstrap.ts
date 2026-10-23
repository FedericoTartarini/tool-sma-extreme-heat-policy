import { useEffect } from "react";
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

  useEffect(() => {
    if (isBootstrapped) {
      return;
    }

    const persistedState = loadPersistedDashboardState(SPORT_TYPE_VALUES);
    bootstrap({
      cards: resolveInitialDashboardCards(persistedState),
      draftSport: resolveInitialDashboardDraftSport(persistedState),
    });
  }, [bootstrap, isBootstrapped]);

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }

    savePersistedDashboardState({
      cards,
    });
  }, [cards, isBootstrapped]);
}
