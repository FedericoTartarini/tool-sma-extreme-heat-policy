import { useEffect, useRef } from "react";
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
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const lastAppliedRef = useRef<{ sport: string; loc: string } | null>(null);

  useEffect(() => {
    if (!canSyncSelection || !selectedLocation) {
      return;
    }

    const nextSelection = {
      sport,
      loc: selectedLocation.formattedLocation,
    };
    const hasSelectionChanged =
      !lastAppliedRef.current ||
      lastAppliedRef.current.sport !== nextSelection.sport ||
      lastAppliedRef.current.loc !== nextSelection.loc;

    if (!hasSelectionChanged) {
      return;
    }

    void (async () => {
      await setQueryStates(
        {
          sport: nextSelection.sport,
          location: nextSelection.loc,
        },
        { history: "replace" },
      );

      if (channel !== "shared") {
        savePersistedHomeFilters(nextSelection);
      }

      lastAppliedRef.current = nextSelection;
    })();
  }, [canSyncSelection, channel, selectedLocation, setQueryStates, sport]);
}
