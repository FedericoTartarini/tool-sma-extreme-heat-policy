import { useQueryStates } from "nuqs";
import { useOptimisticSearchParams } from "nuqs/adapters/react-router/v7";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";
import { loadPersistedHomeFilters } from "@/pages/home/browserState";
import { resolveHomeBootstrapState } from "@/pages/home/homeBootstrap";
import {
  HOME_QUERY_PARSERS,
  HOME_QUERY_URL_KEYS,
  VALID_SPORT_VALUES,
} from "@/pages/home/homeUrlState";
import {
  useHomeStore,
  type HomeStoreBootstrapPayload,
} from "@/store/homeStore";

interface SetQueryStateValues {
  sport: SportType | null;
  location: string | null;
}

export type SetQueryStates = (
  values: SetQueryStateValues,
  options?: { history?: "replace" | "push" },
) => Promise<URLSearchParams>;

interface UseHomeBootstrapResult {
  bootstrapState: HomeStoreBootstrapPayload;
  setQueryStates: SetQueryStates;
}

/**
 * Boots Home store state from URL/local persistence and exposes query setters.
 */
export function useHomeBootstrap(): UseHomeBootstrapResult {
  const { t } = useTranslation();
  const optimisticSearchParams = useOptimisticSearchParams();
  const [{ sport: urlSport, location: urlLocation }, setQueryStates] =
    useQueryStates(HOME_QUERY_PARSERS, {
      urlKeys: HOME_QUERY_URL_KEYS,
    });

  const hasUrlState =
    optimisticSearchParams.has("sport") || optimisticSearchParams.has("loc");
  const persistedFilters = useMemo(
    () => (hasUrlState ? null : loadPersistedHomeFilters(VALID_SPORT_VALUES)),
    [hasUrlState],
  );

  const bootstrapState = useMemo<HomeStoreBootstrapPayload>(
    () =>
      resolveHomeBootstrapState({
        hasUrlState,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: t("home.sections.filters.defaultLocation"),
        urlSport,
        urlLocation,
        persistedFilters,
      }),
    [hasUrlState, persistedFilters, t, urlLocation, urlSport],
  );

  useEffect(() => {
    if (useHomeStore.getState().isBootstrapped) {
      return;
    }

    useHomeStore.getState().bootstrap(bootstrapState);
  }, [bootstrapState]);

  return {
    bootstrapState,
    setQueryStates,
  };
}
