import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getDashboardHeatRiskApiResponseOrThrow,
  toDashboardHeatRiskQueryFailure,
} from "@/api/dashboardHeatRiskQuery";
import { getRetryDelayMs, heatRiskRetryPolicy } from "@/api/apiRetryPolicy";
import { fetchHeatRisk } from "@/api/heatRisk";
import type { HeatRiskApiResponse } from "@/api/heatRisk";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import {
  resolveDashboardCardQueryState,
  resolveWeeklyPreviewSourceFromQuery,
  type DashboardCardQueryView,
  type DashboardCardState,
} from "@/domain/dashboardCardState";
import {
  toDashboardCardKey,
  type SavedDashboardCard,
} from "@/domain/dashboard";
import type { WeeklyPreviewSource } from "@/domain/weeklyWindowPreview";
import { resolveDashboardOtherPeriodDraft } from "@/domain/dashboardOtherPeriod";
import {
  resolveDashboardOtherPeriodCardState,
  type DashboardOtherPeriodCardState,
} from "@/domain/dashboardOtherPeriodCardState";
import {
  resolveDashboardScheduledCardState,
  type DashboardScheduledCardState,
} from "@/domain/dashboardScheduledCardState";
import { useDashboardStore } from "@/store/dashboardStore";

export interface DashboardHeatRiskRefreshResult {
  hasAnySuccess: boolean;
  hasAnyFailure: boolean;
}

interface UseDashboardHeatRiskResult {
  getWeeklyPreviewSource: (card: SavedDashboardCard) => WeeklyPreviewSource;
  getCardState: (card: SavedDashboardCard) => DashboardCardState;
  getScheduledCardState: (
    card: SavedDashboardCard,
    now: Date,
  ) => DashboardScheduledCardState;
  getOtherPeriodCardState: (
    card: SavedDashboardCard,
    now: Date,
  ) => DashboardOtherPeriodCardState;
  hasLoadedCardData: boolean;
  refresh: () => Promise<DashboardHeatRiskRefreshResult>;
}

type DashboardCardQueryResult = {
  data: HeatRiskApiResponse | undefined;
  error: unknown;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  refetch: () => Promise<{ isError: boolean }>;
};

function toDashboardCardQueryView(
  query: DashboardCardQueryResult | undefined,
): DashboardCardQueryView | undefined {
  if (!query) {
    return undefined;
  }

  const failure = toDashboardHeatRiskQueryFailure(query.error);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    errorReason: failure?.kind === "fetch" ? failure.reason : null,
    locationErrorCode: failure?.kind === "location" ? failure.errorCode : null,
  };
}

/**
 * Fetches heat-risk forecasts for saved dashboard cards via `/home/risk`.
 */
export function useDashboardHeatRisk(): UseDashboardHeatRiskResult {
  const cards = useDashboardStore((state) => state.cards);
  const otherPeriodDraft = useDashboardStore((state) => state.otherPeriodDraft);
  const profile = DEFAULT_HEAT_RISK_PROFILE;
  const otherPeriodResolvedDraft = useMemo(
    () => resolveDashboardOtherPeriodDraft(otherPeriodDraft),
    [otherPeriodDraft],
  );

  const queryCards = useMemo(() => {
    const cardsByKey = new Map<string, SavedDashboardCard>();

    for (const card of cards) {
      cardsByKey.set(
        toDashboardCardKey(card.sport, card.latitude, card.longitude),
        card,
      );
    }

    return [...cardsByKey.values()];
  }, [cards]);

  const cardQueries = useQueries({
    queries: queryCards.map((card) => ({
      queryKey: [
        "heatRisk",
        "dashboard",
        profile,
        card.sport,
        card.latitude.toFixed(6),
        card.longitude.toFixed(6),
      ],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const result = await fetchHeatRisk(
          {
            sport: card.sport,
            latitude: card.latitude,
            longitude: card.longitude,
            profile,
          },
          { signal },
        );

        return getDashboardHeatRiskApiResponseOrThrow(result);
      },
      enabled: true,
      placeholderData: keepPreviousData,
      retry: (failureCount: number, error: unknown) =>
        failureCount < heatRiskRetryPolicy.maxRetries &&
        heatRiskRetryPolicy.shouldRetry(error),
      retryDelay: () => getRetryDelayMs({ scope: "heat_risk" }),
      staleTime: 0,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });

  const cardIndexByKey = useMemo(
    () =>
      new Map(
        queryCards.map((card, index) => [
          toDashboardCardKey(card.sport, card.latitude, card.longitude),
          index,
        ]),
      ),
    [queryCards],
  );

  const hasLoadedCardData = useMemo(
    () =>
      cards.length > 0 &&
      cardQueries.some(
        (query) => query.data !== undefined && query.isPlaceholderData !== true,
      ),
    [cards.length, cardQueries],
  );

  async function refresh(): Promise<DashboardHeatRiskRefreshResult> {
    if (queryCards.length === 0) {
      return { hasAnySuccess: false, hasAnyFailure: false };
    }

    const results = await Promise.all(
      cardQueries.map((query) => query.refetch()),
    );

    return {
      hasAnySuccess: results.some((result) => !result.isError),
      hasAnyFailure: results.some((result) => result.isError),
    };
  }

  function getCardQueryView(card: SavedDashboardCard) {
    const index = cardIndexByKey.get(
      toDashboardCardKey(card.sport, card.latitude, card.longitude),
    );

    if (index === undefined) {
      return undefined;
    }

    return toDashboardCardQueryView(
      cardQueries[index] as DashboardCardQueryResult,
    );
  }

  function getCardState(card: SavedDashboardCard): DashboardCardState {
    return resolveDashboardCardQueryState(getCardQueryView(card));
  }

  function getScheduledCardState(
    card: SavedDashboardCard,
    now: Date,
  ): DashboardScheduledCardState {
    return resolveDashboardScheduledCardState(
      card,
      getCardQueryView(card),
      now,
    );
  }

  function getOtherPeriodCardState(
    card: SavedDashboardCard,
    now: Date,
  ): DashboardOtherPeriodCardState {
    return resolveDashboardOtherPeriodCardState(
      getCardQueryView(card),
      otherPeriodResolvedDraft,
      now,
    );
  }

  return {
    getWeeklyPreviewSource: (card) =>
      resolveWeeklyPreviewSourceFromQuery(getCardQueryView(card)),
    getCardState,
    getScheduledCardState,
    getOtherPeriodCardState,
    hasLoadedCardData,
    refresh,
  };
}
