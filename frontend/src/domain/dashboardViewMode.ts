export const DASHBOARD_VIEW_MODES = [
  "now",
  "my_schedule",
  "other_time_period",
] as const;

export type DashboardViewMode = (typeof DASHBOARD_VIEW_MODES)[number];

export const DEFAULT_DASHBOARD_VIEW_MODE: DashboardViewMode = "now";

export function isDashboardViewMode(value: string): value is DashboardViewMode {
  return (DASHBOARD_VIEW_MODES as readonly string[]).includes(value);
}

/**
 * Parses a dashboard view mode from untrusted string input.
 */
export function parseDashboardViewMode(
  value: string,
): DashboardViewMode | null {
  return isDashboardViewMode(value) ? value : null;
}
