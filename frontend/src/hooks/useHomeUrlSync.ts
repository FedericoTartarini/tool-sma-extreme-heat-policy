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
  const channel = useHomeStore((state) => state.channel);
  const profile = useHomeStore((state) => state.profile);
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const lastAppliedRef = useRef<{
    profile: HeatRiskProfile;
    sport: string;
    loc: string;
  } | null>(null);
  const syncRunRef = useRef(0);

  useEffect(() => {
    if (!canSyncSelection || !selectedLocation) {
      return;
    }

    const nextSelection = {
      profile,
      sport,
      loc: selectedLocation.formattedLocation,
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
      await setQueryStates(
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
  }, [
    canSyncSelection,
    channel,
    profile,
    selectedLocation,
    setQueryStates,
    sport,
  ]);
}
