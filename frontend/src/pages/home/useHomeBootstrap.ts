import { useQueryStates } from "nuqs";
import { useOptimisticSearchParams } from "nuqs/adapters/react-router/v7";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_HEAT_RISK_PROFILE,
  type HeatRiskProfile,
} from "@/domain/heatRiskProfile";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";
import { loadPersistedHomeFilters } from "@/pages/home/browserState";
import { resolveHomeBootstrapState } from "@/pages/home/homeBootstrap";
import {
  HOME_QUERY_PARSERS,
  HOME_QUERY_URL_KEYS,
  VALID_PROFILE_VALUES,
  VALID_SPORT_VALUES,
} from "@/pages/home/homeUrlState";
import {
  useHomeStore,
  type HomeStoreBootstrapPayload,
} from "@/store/homeStore";

interface SetQueryStateValues {
  profile: HeatRiskProfile | null;
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
  const [
    { profile: urlProfile, sport: urlSport, location: urlLocation },
    setQueryStates,
  ] = useQueryStates(HOME_QUERY_PARSERS, {
    urlKeys: HOME_QUERY_URL_KEYS,
  });

  const hasUrlState =
    optimisticSearchParams.has("profile") ||
    optimisticSearchParams.has("sport") ||
    optimisticSearchParams.has("loc");
  const persistedFilters = useMemo(
    () =>
      hasUrlState
        ? null
        : loadPersistedHomeFilters(VALID_SPORT_VALUES, VALID_PROFILE_VALUES),
    [hasUrlState],
  );

  const bootstrapState = useMemo<HomeStoreBootstrapPayload>(
    () =>
      resolveHomeBootstrapState({
        hasUrlState,
        defaultProfile: DEFAULT_HEAT_RISK_PROFILE,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: t("home.sections.filters.defaultLocation"),
        urlProfile,
        urlSport,
        urlLocation,
        persistedFilters,
      }),
    [hasUrlState, persistedFilters, t, urlLocation, urlProfile, urlSport],
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
