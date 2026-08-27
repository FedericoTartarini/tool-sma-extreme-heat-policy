import { useEffect } from "react";
import { SPORT_TYPE_VALUES } from "@/domain/sport";
import {
  loadPersistedMulticityState,
  resolveInitialMulticityLocations,
  resolveInitialMulticitySport,
  savePersistedMulticityState,
} from "@/pages/multicity/browserState";
import { useMulticityStore } from "@/store/multicityStore";

/**
 * Bootstraps multi-city dashboard state from localStorage and keeps it persisted.
 */
export function useMulticityBootstrap(): void {
  const isBootstrapped = useMulticityStore((state) => state.isBootstrapped);
  const bootstrap = useMulticityStore((state) => state.bootstrap);
  const sport = useMulticityStore((state) => state.sport);
  const locations = useMulticityStore((state) => state.locations);

  useEffect(() => {
    if (isBootstrapped) {
      return;
    }

    const persistedState = loadPersistedMulticityState(SPORT_TYPE_VALUES);
    bootstrap({
      sport: resolveInitialMulticitySport(persistedState),
      locations: resolveInitialMulticityLocations(persistedState),
    });
  }, [bootstrap, isBootstrapped]);

  useEffect(() => {
    if (!isBootstrapped) {
      return;
    }

    savePersistedMulticityState({
      sport,
      locations,
    });
  }, [isBootstrapped, locations, sport]);
}
