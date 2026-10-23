import type { HeatRiskApiResponse, HeatRiskErrorReason } from "@/api/heatRisk";
import type { DashboardHeatRiskLocationErrorCode } from "@/api/dashboardHeatRiskQuery";
import {
  deriveDashboardRiskLevels,
  toDashboardForecastSnapshot,
} from "@/domain/dashboardForecast";
import type { RiskLevel } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import type { ScheduledWindow, WeeklyWindow } from "@/domain/weeklyWindow";
import { summarizeWeeklyWindowRisk } from "@/domain/weeklyWindowForecast";
import {
  resolveWeeklyWindowPreview,
  type WeeklyPreviewSource,
} from "@/domain/weeklyWindowPreview";

export type DashboardCardLocationErrorCode =
  | DashboardHeatRiskLocationErrorCode
  | "risk_calculation_failed";

export interface DashboardCardQueryView {
  data: HeatRiskApiResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  errorReason: HeatRiskErrorReason | null;
  locationErrorCode: DashboardCardLocationErrorCode | null;
}

export type DashboardCardState =
  | { status: "loading" }
  | {
      status: "fetch_error";
      reason: HeatRiskErrorReason;
    }
  | {
      status: "location_error";
      errorCode: DashboardCardLocationErrorCode;
    }
  | {
      status: "missing_result";
    }
  | {
      status: "ok";
      currentRiskScore: number;
      todayMaxRiskScore: number;
      currentRiskLevel: RiskLevel;
      todayMaxRiskLevel: RiskLevel;
    };

type DashboardCardUnavailableState = Exclude<
  DashboardCardState,
  { status: "ok" }
>;

export type DashboardWeeklyWindowCardState =
  | DashboardCardUnavailableState
  | {
      status:
        | "unavailable"
        | "invalid_time_zone"
        | "invalid_window"
        | "invalid_forecast";
    }
  | { status: "incomplete_forecast"; window: ScheduledWindow }
  | { status: "unresolved_local_time"; localDate: string; timeZone: string }
  | {
      status: "ok";
      window: ScheduledWindow;
      averageRiskScore: number;
      minRiskScore: number;
      maxRiskScore: number;
      averageRiskLevel: RiskLevel;
      minRiskLevel: RiskLevel;
      maxRiskLevel: RiskLevel;
    };

/**
 * @deprecated Use {@link toDashboardLocationErrorI18nKey} from `dashboardErrorMap`.
 */
export function toDashboardCardErrorI18nKey(
  errorCode: DashboardCardLocationErrorCode | null,
): string {
  if (errorCode === "risk_calculation_failed") {
    return "dashboard.cardErrors.riskCalculationFailed";
  }

  if (errorCode === "unknown_inputs") {
    return "dashboard.cardErrors.unknownInputs";
  }

  return "dashboard.cardErrors.generic";
}

function resolveLocationError(
  errorCode: DashboardCardLocationErrorCode,
): DashboardCardState {
  return {
    status: "location_error",
    errorCode,
  };
}

function resolveFetchErrorReason(
  errorReason: HeatRiskErrorReason | null,
): DashboardCardState {
  return {
    status: "fetch_error",
    reason: errorReason ?? "network",
  };
}

function hasFreshDashboardCardMetrics(
  response: HeatRiskApiResponse | null | undefined,
  options: {
    isPlaceholderData: boolean;
    isError: boolean;
    isFetching: boolean;
  },
): boolean {
  if (
    !response ||
    options.isPlaceholderData ||
    options.isError ||
    options.isFetching
  ) {
    return false;
  }

  return deriveDashboardRiskLevels(response.forecast) !== null;
}

/**
 * Resolves a saved card's state from a single `/home/risk` response.
 *
 * Mirrors Home's `hasCalculatedRisk` gate: stale placeholder data and failed
 * fetches must not render as fresh card metrics.
 */
export function resolveDashboardCardState(
  response: HeatRiskApiResponse | null | undefined,
  options?: {
    isLoading?: boolean;
    isFetching?: boolean;
    isPlaceholderData?: boolean;
    isError?: boolean;
    errorReason?: HeatRiskErrorReason | null;
    locationErrorCode?: DashboardCardLocationErrorCode | null;
  },
): DashboardCardState {
  const isLoading = options?.isLoading === true;
  const isFetching = options?.isFetching === true;
  const isPlaceholderData = options?.isPlaceholderData === true;
  const isError = options?.isError === true;
  const errorReason = options?.errorReason ?? null;
  const locationErrorCode = options?.locationErrorCode ?? null;

  if (
    hasFreshDashboardCardMetrics(response, {
      isPlaceholderData,
      isError,
      isFetching,
    }) &&
    response
  ) {
    const derivedRiskLevels = deriveDashboardRiskLevels(response.forecast);

    if (!derivedRiskLevels) {
      return resolveLocationError("risk_calculation_failed");
    }

    return {
      status: "ok",
      currentRiskScore: derivedRiskLevels.currentRiskLevelInterpolated,
      todayMaxRiskScore: derivedRiskLevels.todayMaxRiskLevelInterpolated,
      currentRiskLevel: toRiskLevel(
        derivedRiskLevels.currentRiskLevelInterpolated,
      ),
      todayMaxRiskLevel: toRiskLevel(
        derivedRiskLevels.todayMaxRiskLevelInterpolated,
      ),
    };
  }

  if (isLoading && !response) {
    return { status: "loading" };
  }

  if (!response) {
    if (locationErrorCode) {
      return resolveLocationError(locationErrorCode);
    }

    if (errorReason) {
      return resolveFetchErrorReason(errorReason);
    }

    return { status: isFetching || isLoading ? "loading" : "missing_result" };
  }

  if (isError) {
    if (locationErrorCode) {
      return resolveLocationError(locationErrorCode);
    }

    return resolveFetchErrorReason(errorReason);
  }

  if (isPlaceholderData || isFetching || isLoading) {
    return { status: "loading" };
  }

  return resolveLocationError("risk_calculation_failed");
}

/**
 * Maps one dashboard card query result into card UI state.
 */
export function resolveDashboardCardQueryState(
  query: DashboardCardQueryView | undefined,
): DashboardCardState {
  if (!query) {
    return { status: "missing_result" };
  }

  return resolveDashboardCardState(query.data, {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    errorReason: query.errorReason,
    locationErrorCode: query.locationErrorCode,
  });
}

/**
 * Maps one dashboard card query result into weekly preview source state.
 */
export function resolveWeeklyPreviewSourceFromQuery(
  query: DashboardCardQueryView | undefined,
): WeeklyPreviewSource {
  const cardState = resolveDashboardCardQueryState(query);

  if (cardState.status === "loading") {
    return { status: "loading" };
  }

  if (cardState.status !== "ok" || !query?.data) {
    return { status: "unavailable" };
  }

  return {
    status: "ok",
    result: toDashboardForecastSnapshot(query.data),
  };
}

/**
 * Resolves average/min/max risk for the next weekly window on a card forecast.
 */
export function resolveDashboardWeeklyWindowCardState(
  query: DashboardCardQueryView | undefined,
  weeklyWindow: Omit<WeeklyWindow, "timeZone">,
  now: Date,
  options?: { includeInProgress?: boolean },
): DashboardWeeklyWindowCardState {
  const cardState = resolveDashboardCardQueryState(query);

  if (cardState.status !== "ok") {
    return cardState;
  }

  const preview = resolveWeeklyWindowPreview(
    weeklyWindow,
    resolveWeeklyPreviewSourceFromQuery(query),
    now,
    options,
  );

  if (preview.status === "incomplete_forecast") {
    return { status: "incomplete_forecast", window: preview.window };
  }

  if (preview.status === "unresolved_local_time") {
    return {
      status: "unresolved_local_time",
      localDate: preview.localDate,
      timeZone: preview.timeZone,
    };
  }

  if (preview.status !== "ok") {
    return { status: preview.status };
  }

  const summary = summarizeWeeklyWindowRisk(preview.points);
  if (!summary) {
    return { status: "invalid_forecast" };
  }

  return {
    status: "ok",
    window: preview.window,
    ...summary,
    averageRiskLevel: toRiskLevel(summary.averageRiskScore),
    minRiskLevel: toRiskLevel(summary.minRiskScore),
    maxRiskLevel: toRiskLevel(summary.maxRiskScore),
  };
}
