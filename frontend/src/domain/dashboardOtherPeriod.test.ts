import { describe, expect, it } from "vitest";
import {
  createDefaultDashboardOtherPeriodDraft,
  isRestorableDashboardOtherPeriodDraft,
  resolveDashboardOtherPeriodDraft,
} from "@/domain/dashboardOtherPeriod";

describe("dashboard other period draft", () => {
  it("resolves a complete selection", () => {
    expect(
      resolveDashboardOtherPeriodDraft({
        weekday: 2,
        startMinutes: 540,
        endMinutes: 660,
      }),
    ).toEqual({
      status: "complete",
      selection: {
        weekday: 2,
        startMinutes: 540,
        endMinutes: 660,
      },
    });
  });

  it("reports incomplete drafts", () => {
    expect(
      resolveDashboardOtherPeriodDraft({
        weekday: 2,
        startMinutes: 540,
        endMinutes: null,
      }),
    ).toEqual({ status: "incomplete" });
  });

  it("reports overnight windows as invalid", () => {
    expect(
      resolveDashboardOtherPeriodDraft({
        weekday: 2,
        startMinutes: 1080,
        endMinutes: 540,
      }),
    ).toEqual({
      status: "invalid",
      reason: "unsupported_overnight_window",
    });
  });

  it("creates a default draft with a same-day range", () => {
    const draft = createDefaultDashboardOtherPeriodDraft(
      new Date("2026-09-15T12:00:00Z"),
    );

    expect(draft.weekday).toBe(2);
    expect(draft.startMinutes).toBe(9 * 60);
    expect(draft.endMinutes).toBe(12 * 60);
    expect(resolveDashboardOtherPeriodDraft(draft).status).toBe("complete");
  });

  it("keeps a partial draft whose empty fields are null", () => {
    expect(
      isRestorableDashboardOtherPeriodDraft({
        weekday: 2,
        startMinutes: 540,
        endMinutes: null,
      }),
    ).toBe(true);
  });

  it("rejects times the hour fields cannot show and overnight ranges", () => {
    expect(
      isRestorableDashboardOtherPeriodDraft({
        weekday: 2,
        startMinutes: 90,
        endMinutes: 180,
      }),
    ).toBe(false);
    expect(
      isRestorableDashboardOtherPeriodDraft({
        weekday: 2,
        startMinutes: 1080,
        endMinutes: 540,
      }),
    ).toBe(false);
  });
});
