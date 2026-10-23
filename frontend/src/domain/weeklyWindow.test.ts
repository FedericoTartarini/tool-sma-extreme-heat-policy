import { describe, expect, it } from "vitest";
import {
  getNextWeeklyWindow,
  validateWeeklyWindow,
  validateWeeklyWindowFields,
  type WeeklyWindow,
} from "@/domain/weeklyWindow";

const TUESDAY: WeeklyWindow = {
  weekdays: [2],
  startMinutes: 18 * 60,
  endMinutes: 20 * 60,
  timeZone: "Australia/Sydney",
};

describe("weekly window validation", () => {
  it("validates form fields before a location timezone is available", () => {
    expect(
      validateWeeklyWindowFields({
        weekdays: [2],
        startMinutes: 1080,
        endMinutes: 1200,
      }),
    ).toBeNull();
    expect(
      validateWeeklyWindowFields({
        weekdays: [2],
        startMinutes: 1200,
        endMinutes: 1080,
      }),
    ).toBe("unsupported_overnight_window");
  });

  it.each([
    [{ weekdays: [] }, "invalid_weekdays"],
    [{ weekdays: [2, 2] }, "invalid_weekdays"],
    [{ weekdays: [7] }, "invalid_weekdays"],
    [{ weekdays: [1.5] }, "invalid_weekdays"],
    [{ startMinutes: -1 }, "invalid_minutes"],
    [{ startMinutes: 1440 }, "invalid_minutes"],
    [{ startMinutes: 18.5 }, "invalid_minutes"],
    [{ endMinutes: NaN }, "invalid_minutes"],
    [{ endMinutes: 1441 }, "invalid_minutes"],
    [{ endMinutes: 1080 }, "invalid_minutes"],
    [{ endMinutes: 60 }, "unsupported_overnight_window"],
    [{ timeZone: "" }, "invalid_time_zone"],
    [{ timeZone: "Mars/Olympus" }, "invalid_time_zone"],
  ])("rejects %j with %s", (change, reason) => {
    expect(
      validateWeeklyWindow({ ...TUESDAY, ...change } as WeeklyWindow),
    ).toBe(reason);
  });

  it("accepts minute precision and durations longer than three hours", () => {
    expect(
      validateWeeklyWindow({ ...TUESDAY, startMinutes: 9 * 60 + 15 }),
    ).toBeNull();
  });
});

describe("next weekly window", () => {
  it("uses the location's calendar day even when the UTC weekday differs", () => {
    const result = getNextWeeklyWindow(
      { ...TUESDAY, startMinutes: 30, endMinutes: 90 },
      new Date("2026-09-14T13:00:00Z"),
    );
    expect(result).toEqual({
      status: "ok",
      window: {
        localDate: "2026-09-15",
        timeZone: "Australia/Sydney",
        startUtc: "2026-09-14T14:30:00.000Z",
        endUtc: "2026-09-14T15:30:00.000Z",
      },
    });
  });

  it("keeps an occurrence starting exactly now", () => {
    expect(
      getNextWeeklyWindow(TUESDAY, new Date("2026-09-15T08:00:00Z")),
    ).toMatchObject({
      status: "ok",
      window: { startUtc: "2026-09-15T08:00:00.000Z" },
    });
  });

  it("rolls an already-started occurrence to next week, including seconds", () => {
    expect(
      getNextWeeklyWindow(TUESDAY, new Date("2026-09-15T08:00:01Z")),
    ).toMatchObject({
      status: "ok",
      window: { startUtc: "2026-09-22T08:00:00.000Z" },
    });
  });

  it("keeps an in-progress occurrence when asked, and rolls it once it has ended", () => {
    expect(
      getNextWeeklyWindow(TUESDAY, new Date("2026-09-15T08:00:01Z"), {
        includeInProgress: true,
      }),
    ).toMatchObject({
      status: "ok",
      window: { startUtc: "2026-09-15T08:00:00.000Z" },
    });
    expect(
      getNextWeeklyWindow(TUESDAY, new Date("2026-09-15T10:00:01Z"), {
        includeInProgress: true,
      }),
    ).toMatchObject({
      status: "ok",
      window: { startUtc: "2026-09-22T08:00:00.000Z" },
    });
  });

  it("chooses the earliest selected weekday regardless of array order", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, weekdays: [5, 2, 4] },
        new Date("2026-09-15T11:00:00Z"),
      ),
    ).toMatchObject({ status: "ok", window: { localDate: "2026-09-17" } });
  });

  it("rolls across the year boundary", () => {
    expect(
      getNextWeeklyWindow(TUESDAY, new Date("2026-12-31T00:00:00Z")),
    ).toMatchObject({ status: "ok", window: { localDate: "2027-01-05" } });
  });

  it("uses midnight of the following day for end minute 1440", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, endMinutes: 1440 },
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toMatchObject({
      status: "ok",
      window: { endUtc: "2026-09-15T14:00:00.000Z" },
    });
  });

  it("supports a timezone with a 45-minute offset", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, timeZone: "Asia/Kathmandu" },
        new Date("2026-09-15T00:00:00Z"),
      ),
    ).toMatchObject({
      status: "ok",
      window: { startUtc: "2026-09-15T12:15:00.000Z" },
    });
  });

  it("uses the new DST offset for the next week's occurrence", () => {
    expect(
      getNextWeeklyWindow(TUESDAY, new Date("2026-10-03T00:00:00Z")),
    ).toMatchObject({
      status: "ok",
      window: { startUtc: "2026-10-06T07:00:00.000Z" },
    });
  });

  it("does not silently shift a nonexistent spring-forward time", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, weekdays: [0], startMinutes: 150, endMinutes: 210 },
        new Date("2026-10-03T00:00:00Z"),
      ),
    ).toEqual({
      status: "unresolved_local_time",
      reason: "nonexistent",
      localDate: "2026-10-04",
    });
  });

  it("does not silently select one of two fall-back times", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, weekdays: [0], startMinutes: 150, endMinutes: 210 },
        new Date("2026-04-04T00:00:00Z"),
      ),
    ).toMatchObject({ status: "unresolved_local_time", reason: "ambiguous" });
  });

  it("still reports a repeated time if its second occurrence is in the future", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, weekdays: [0], startMinutes: 150, endMinutes: 210 },
        new Date("2026-04-04T15:45:00Z"),
      ),
    ).toMatchObject({ status: "unresolved_local_time", reason: "ambiguous" });
  });

  it("checks the end of the window for DST ambiguity too", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, weekdays: [0], startMinutes: 60, endMinutes: 150 },
        new Date("2026-04-04T00:00:00Z"),
      ),
    ).toMatchObject({ status: "unresolved_local_time", reason: "ambiguous" });
  });

  it("accounts for a DST transition inside a window with unambiguous endpoints", () => {
    expect(
      getNextWeeklyWindow(
        { ...TUESDAY, weekdays: [0], startMinutes: 60, endMinutes: 240 },
        new Date("2026-10-03T00:00:00Z"),
      ),
    ).toMatchObject({
      status: "ok",
      window: {
        startUtc: "2026-10-03T15:00:00.000Z",
        endUtc: "2026-10-03T17:00:00.000Z",
      },
    });
  });

  it("detects the half-hour DST gap in Lord Howe", () => {
    expect(
      getNextWeeklyWindow(
        {
          ...TUESDAY,
          timeZone: "Australia/Lord_Howe",
          weekdays: [0],
          startMinutes: 135,
          endMinutes: 180,
        },
        new Date("2026-10-03T00:00:00Z"),
      ),
    ).toMatchObject({ status: "unresolved_local_time", reason: "nonexistent" });
  });

  it("rejects invalid dates and invalid schedules explicitly", () => {
    expect(getNextWeeklyWindow(TUESDAY, new Date(NaN))).toEqual({
      status: "invalid",
      reason: "invalid_now",
    });
    expect(
      getNextWeeklyWindow({ ...TUESDAY, weekdays: [] }, new Date()),
    ).toEqual({ status: "invalid", reason: "invalid_weekdays" });
  });
});
