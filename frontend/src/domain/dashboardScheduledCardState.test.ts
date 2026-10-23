import { describe, expect, it } from "vitest";
import type { DashboardCardQueryView } from "@/domain/dashboardCardState";
import { resolveDashboardScheduledCardState } from "@/domain/dashboardScheduledCardState";
import {
  sydneyCard,
  sydneyHeatRiskResponse,
} from "@/test/weeklyWindowFixtures";

function query(
  overrides: Partial<DashboardCardQueryView> = {},
): DashboardCardQueryView {
  return {
    data: sydneyHeatRiskResponse(),
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    isError: false,
    errorReason: null,
    locationErrorCode: null,
    ...overrides,
  };
}

const scheduledSydneyCard = {
  ...sydneyCard,
  schedule: {
    weekdays: [2] as const,
    startMinutes: 1080,
    endMinutes: 1200,
  },
};

describe("dashboard scheduled card state", () => {
  it("uses the response timezone and summarizes the next scheduled window", () => {
    const result = resolveDashboardScheduledCardState(
      scheduledSydneyCard,
      query(),
      new Date("2026-09-15T00:00:00Z"),
    );

    expect(result).toMatchObject({
      status: "ok",
      window: {
        localDate: "2026-09-15",
        timeZone: "Australia/Sydney",
        startUtc: "2026-09-15T08:00:00.000Z",
        endUtc: "2026-09-15T10:00:00.000Z",
      },
      minRiskScore: 1.2,
      maxRiskScore: 3.2,
      averageRiskLevel: "low",
      minRiskLevel: "low",
      maxRiskLevel: "high",
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") {
      throw new Error("Expected a scheduled risk summary");
    }
    expect(result.averageRiskScore).toBeCloseTo(1.8667, 4);
  });

  it("reports an old card without a persisted schedule", () => {
    expect(
      resolveDashboardScheduledCardState(
        sydneyCard,
        query(),
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toEqual({ status: "missing_schedule" });
  });

  it("does not use this week's forecast after the occurrence has started", () => {
    expect(
      resolveDashboardScheduledCardState(
        scheduledSydneyCard,
        query(),
        new Date("2026-09-15T08:00:01Z"),
      ),
    ).toMatchObject({
      status: "incomplete_forecast",
      window: { localDate: "2026-09-22" },
    });
  });

  it("preserves fetch failures instead of calculating from stale data", () => {
    expect(
      resolveDashboardScheduledCardState(
        scheduledSydneyCard,
        query({
          isError: true,
          errorReason: "network",
        }),
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toEqual({ status: "fetch_error", reason: "network" });
  });
});
