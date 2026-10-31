import {
  resolveDashboardCardQueryState,
  resolveDashboardWeeklyWindowCardState,
  type DashboardCardQueryView,
  type DashboardWeeklyWindowCardState,
} from "@/domain/dashboardCardState";
import type { ResolvedDashboardOtherPeriodDraft } from "@/domain/dashboardOtherPeriod";

export type DashboardOtherPeriodCardState =
  | DashboardWeeklyWindowCardState
  | { status: "missing_selection" | "invalid_selection" };

/**
 * Resolves heat-risk metrics for the selected weekday window, including one
 * that has already started. A window that has ended rolls forward.
 */
export function resolveDashboardOtherPeriodCardState(
  query: DashboardCardQueryView | undefined,
  resolvedDraft: ResolvedDashboardOtherPeriodDraft,
  now: Date,
): DashboardOtherPeriodCardState {
  if (resolvedDraft.status !== "complete") {
    const cardState = resolveDashboardCardQueryState(query);

    if (cardState.status !== "ok") {
      return cardState;
    }

    if (resolvedDraft.status === "invalid") {
      return { status: "invalid_selection" };
    }

    return { status: "missing_selection" };
  }

  const { selection } = resolvedDraft;
  const windowState = resolveDashboardWeeklyWindowCardState(
    query,
    {
      weekdays: [selection.weekday],
      startMinutes: selection.startMinutes,
      endMinutes: selection.endMinutes,
    },
    now,
    { includeInProgress: true },
  );

  if (windowState.status === "invalid_window") {
    return { status: "invalid_selection" };
  }

  return windowState;
}
