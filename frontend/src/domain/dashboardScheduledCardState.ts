import type { SavedDashboardCard } from "@/domain/dashboard";
import {
  resolveDashboardCardQueryState,
  resolveDashboardWeeklyWindowCardState,
  type DashboardCardQueryView,
  type DashboardWeeklyWindowCardState,
} from "@/domain/dashboardCardState";

export type DashboardScheduledCardState =
  | DashboardWeeklyWindowCardState
  | { status: "missing_schedule" };

/**
 * Resolves the next saved schedule occurrence from the card's own forecast.
 */
export function resolveDashboardScheduledCardState(
  card: SavedDashboardCard,
  query: DashboardCardQueryView | undefined,
  now: Date,
): DashboardScheduledCardState {
  if (!card.schedule) {
    const cardState = resolveDashboardCardQueryState(query);

    if (cardState.status !== "ok") {
      return cardState;
    }

    return { status: "missing_schedule" };
  }

  return resolveDashboardWeeklyWindowCardState(query, card.schedule, now);
}
