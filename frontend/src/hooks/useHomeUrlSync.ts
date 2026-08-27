import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { HeatRiskProfile } from "@/domain/heatRiskProfile";
import { savePersistedHomeFilters } from "@/pages/home/browserState";
import type { SetQueryStates } from "@/pages/home/useHomeBootstrap";
import { parseHomeSearchParams } from "@/pages/home/homeUrlState";
import { useHomeStore } from "@/store/homeStore";

interface UseHomeUrlSyncParams {
  setQueryStates: SetQueryStates;
  canSyncSelection: boolean;
}

export function isSharedNavigationInProgress(params: {
  channel: ReturnType<typeof useHomeStore.getState>["channel"];
  urlLocation: string | null;
  prefilledLocationResolveState: ReturnType<
    typeof useHomeStore.getState
  >["prefilledLocationResolveState"];
}): boolean {
  const { channel, urlLocation, prefilledLocationResolveState } = params;

  if (channel !== "shared" || !urlLocation) {
    return false;
  }

  return (
    prefilledLocationResolveState === "pending" ||
    prefilledLocationResolveState === "resolving"
  );
}

/**
 * Synchronizes successful Home filter selections into URL and local storage.
 */
export function useHomeUrlSync({
  setQueryStates,
  canSyncSelection,
}: UseHomeUrlSyncParams): void {
  const location = useLocation();
  const channel = useHomeStore((state) => state.channel);
  const profile = useHomeStore((state) => state.profile);
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const prefilledLocationResolveState = useHomeStore(
    (state) => state.prefilledLocationResolveState,
  );
  const lastAppliedRef = useRef<{
    profile: HeatRiskProfile;
    sport: string;
    loc: string;
  } | null>(null);
  const syncRunRef = useRef(0);
  const urlLocation =
    parseHomeSearchParams(location.search).location?.trim() ?? "";

  useEffect(() => {
    if (!canSyncSelection || !selectedLocation) {
      return;
    }

    if (
      isSharedNavigationInProgress({
        channel,
        urlLocation: urlLocation || null,
        prefilledLocationResolveState,
      })
    ) {
      return;
    }

    const nextSelection = {
      profile,
      sport,
      loc: selectedLocation.displayLabel,
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
    prefilledLocationResolveState,
    profile,
    selectedLocation,
    setQueryStates,
    sport,
    urlLocation,
  ]);
}
