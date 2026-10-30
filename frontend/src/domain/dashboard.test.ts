import { describe, expect, it } from "vitest";
import {
  DASHBOARD_HOME_LINK_STATE,
  isDashboardHomeLinkState,
  resolveDashboardCardScheduleDraft,
} from "@/domain/dashboard";

describe("isDashboardHomeLinkState", () => {
  it("recognises the state set on dashboard card links", () => {
    expect(isDashboardHomeLinkState(DASHBOARD_HOME_LINK_STATE)).toBe(true);
  });

  it("rejects missing or unrelated router state", () => {
    expect(isDashboardHomeLinkState(null)).toBe(false);
    expect(isDashboardHomeLinkState({ from: "elsewhere" })).toBe(false);
  });
});

describe("resolveDashboardCardScheduleDraft", () => {
  it("treats an untouched draft as no schedule", () => {
    expect(
      resolveDashboardCardScheduleDraft({
        weekdays: [],
        startMinutes: null,
        endMinutes: null,
      }),
    ).toEqual({ status: "empty" });
  });

  it.each([
    [{ weekdays: [2], startMinutes: null, endMinutes: null }],
    [{ weekdays: [], startMinutes: 1080, endMinutes: 1200 }],
    [{ weekdays: [2], startMinutes: 1080, endMinutes: null }],
    [{ weekdays: [2], startMinutes: null, endMinutes: 1200 }],
  ] as const)("reports a partly filled draft as incomplete", (draft) => {
    expect(resolveDashboardCardScheduleDraft(draft)).toEqual({
      status: "incomplete",
    });
  });

  it("builds the schedule once every part is chosen", () => {
    expect(
      resolveDashboardCardScheduleDraft({
        weekdays: [2, 4],
        startMinutes: 1080,
        endMinutes: 1440,
      }),
    ).toEqual({
      status: "complete",
      schedule: { weekdays: [2, 4], startMinutes: 1080, endMinutes: 1440 },
    });
  });

  it("keeps midnight at the start of the day as a chosen time", () => {
    expect(
      resolveDashboardCardScheduleDraft({
        weekdays: [0],
        startMinutes: 0,
        endMinutes: 60,
      }),
    ).toEqual({
      status: "complete",
      schedule: { weekdays: [0], startMinutes: 0, endMinutes: 60 },
    });
  });

  it("rejects an overnight draft without needing a timezone", () => {
    expect(
      resolveDashboardCardScheduleDraft({
        weekdays: [2],
        startMinutes: 1200,
        endMinutes: 1080,
      }),
    ).toEqual({
      status: "invalid",
      reason: "unsupported_overnight_window",
    });
  });
});
