import { useEffect, useRef } from "react";
import type { HeatRiskProfile } from "@/domain/heatRiskProfile";
import { savePersistedHomeFilters } from "@/pages/home/browserState";
import type { SetQueryStates } from "@/pages/home/useHomeBootstrap";
import { useHomeStore } from "@/store/homeStore";

interface UseHomeUrlSyncParams {
  setQueryStates: SetQueryStates;
  canSyncSelection: boolean;
}

/**
 * Synchronizes successful Home filter selections into URL and local storage.
 */
export function useHomeUrlSync({
  setQueryStates,
  canSyncSelection,
}: UseHomeUrlSyncParams): void {
  const profile = useHomeStore((state) => state.profile);
  const sport = useHomeStore((state) => state.sport);
  const selectedLocationLabel = useHomeStore(
    (state) => state.selectedLocation?.displayLabel ?? null,
  );
  const setQueryStatesRef = useRef(setQueryStates);

  useEffect(() => {
    setQueryStatesRef.current = setQueryStates;
  }, [setQueryStates]);

  const lastAppliedRef = useRef<{
    profile: HeatRiskProfile;
    sport: string;
    loc: string;
  } | null>(null);
  const syncRunRef = useRef(0);

  useEffect(() => {
    if (!canSyncSelection) {
      return;
    }

    const {
      channel,
      profile: currentProfile,
      sport: currentSport,
      selectedLocation: currentSelectedLocation,
    } = useHomeStore.getState();

    if (!currentSelectedLocation) {
      return;
    }

    const nextSelection = {
      profile: currentProfile,
      sport: currentSport,
      loc: currentSelectedLocation.displayLabel,
    };
    const hasSelectionChanged =
      !lastAppliedRef.current ||
      lastAppliedRef.current.profile !== nextSelection.profile ||
      lastAppliedRef.current.sport !== nextSelection.sport ||
      lastAppliedRef.current.loc !== nextSelection.loc;

    if (!hasSelectionChanged) {
      return;
    }

    const runId = ++syncRunRef.current;

    void (async () => {
      await setQueryStatesRef.current(
        {
          profile: nextSelection.profile,
          sport: nextSelection.sport,
          location: nextSelection.loc,
        },
        { history: "replace" },
      );

      if (runId !== syncRunRef.current) {
        return;
      }

      if (channel !== "shared") {
        savePersistedHomeFilters(nextSelection);
      }

      lastAppliedRef.current = nextSelection;
    })();

    return () => {
      syncRunRef.current += 1;
    };
  }, [canSyncSelection, profile, selectedLocationLabel, sport]);
}
