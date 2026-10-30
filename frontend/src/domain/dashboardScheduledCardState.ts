import type { SavedDashboardCard } from "@/domain/dashboard";
import {
  resolveDashboardWeeklyWindowCardState,
  type DashboardCardQueryView,
  type DashboardWeeklyWindowCardState,
} from "@/domain/dashboardCardState";

export type DashboardScheduledCardState = DashboardWeeklyWindowCardState;

/**
 * Resolves the next saved schedule occurrence from the card's own forecast.
 */
export function resolveDashboardScheduledCardState(
  card: SavedDashboardCard,
  query: DashboardCardQueryView | undefined,
  now: Date,
): DashboardScheduledCardState {
  return resolveDashboardWeeklyWindowCardState(query, card.schedule, now);
}
