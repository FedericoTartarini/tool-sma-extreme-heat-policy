import { useQueryStates } from "nuqs";
import { useLayoutEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_HEAT_RISK_PROFILE,
  type HeatRiskProfile,
} from "@/domain/heatRiskProfile";
import { DEFAULT_SPORT_TYPE, type SportType } from "@/domain/sport";
import {
  loadPersistedHomeFilters,
  loadPersistedShowWeatherDetails,
} from "@/pages/home/browserState";
import { resolveHomeBootstrapState } from "@/pages/home/homeBootstrap";
import {
  hasHomeSearchParams,
  HOME_QUERY_PARSERS,
  HOME_QUERY_URL_KEYS,
  parseHomeSearchParams,
  VALID_PROFILE_VALUES,
  VALID_SPORT_VALUES,
} from "@/pages/home/homeUrlState";
import {
  useHomeStore,
  type HomeStoreBootstrapPayload,
} from "@/store/homeStore";
import { useHomeUiStore } from "@/store/homeUiStore";

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
  const location = useLocation();
  const [, setQueryStates] = useQueryStates(HOME_QUERY_PARSERS, {
    urlKeys: HOME_QUERY_URL_KEYS,
  });

  const parsedUrlState = useMemo(
    () => parseHomeSearchParams(location.search),
    [location.search],
  );

  const hasUrlState = hasHomeSearchParams(location.search);
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
        urlProfile: parsedUrlState.profile,
        urlSport: parsedUrlState.sport,
        urlLocation: parsedUrlState.location,
        persistedFilters,
      }),
    [
      hasUrlState,
      parsedUrlState.location,
      parsedUrlState.profile,
      parsedUrlState.sport,
      persistedFilters,
      t,
    ],
  );

  useLayoutEffect(() => {
    const store = useHomeStore.getState();

    if (!store.isBootstrapped) {
      store.bootstrap(bootstrapState);
      return;
    }

    if (!hasUrlState) {
      return;
    }

    store.applySharedUrlNavigation(bootstrapState);
  }, [bootstrapState, hasUrlState]);

  useLayoutEffect(() => {
    useHomeUiStore
      .getState()
      .setShowWeatherDetails(loadPersistedShowWeatherDetails());
  }, []);

  return {
    bootstrapState,
    setQueryStates,
  };
}
