import { describe, expect, it } from "vitest";
import type { DashboardCardQueryView } from "@/domain/dashboardCardState";
import { resolveDashboardOtherPeriodDraft } from "@/domain/dashboardOtherPeriod";
import { resolveDashboardOtherPeriodCardState } from "@/domain/dashboardOtherPeriodCardState";
import { sydneyHeatRiskResponse } from "@/test/weeklyWindowFixtures";

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

const completeDraft = resolveDashboardOtherPeriodDraft({
  weekday: 2,
  startMinutes: 1080,
  endMinutes: 1200,
});

describe("dashboard other period card state", () => {
  it("summarizes risk for the next occurrence of the selected weekday", () => {
    const result = resolveDashboardOtherPeriodCardState(
      query(),
      completeDraft,
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
    });
  });

  it("reports a missing selection", () => {
    expect(
      resolveDashboardOtherPeriodCardState(
        query(),
        resolveDashboardOtherPeriodDraft({
          weekday: 2,
          startMinutes: 1080,
          endMinutes: null,
        }),
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toEqual({
      status: "missing_selection",
    });
  });

  it("reports an invalid selection separately from a missing one", () => {
    expect(
      resolveDashboardOtherPeriodCardState(
        query(),
        resolveDashboardOtherPeriodDraft({
          weekday: 2,
          startMinutes: 1080,
          endMinutes: 540,
        }),
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toEqual({
      status: "invalid_selection",
    });
  });

  it("keeps an in-progress occurrence that the forecast still covers", () => {
    const result = resolveDashboardOtherPeriodCardState(
      query(),
      completeDraft,
      new Date("2026-09-15T08:00:01Z"),
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
    });
  });

  it("reports incomplete forecast coverage once that occurrence has ended", () => {
    expect(
      resolveDashboardOtherPeriodCardState(
        query(),
        completeDraft,
        new Date("2026-09-15T10:00:01Z"),
      ),
    ).toMatchObject({
      status: "incomplete_forecast",
      window: { localDate: "2026-09-22" },
    });
  });
});
