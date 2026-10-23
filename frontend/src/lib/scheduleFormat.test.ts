import { describe, expect, it } from "vitest";
import {
  formatDashboardCardSchedule,
  formatMinutesOfDay,
  formatScheduledWindowTimeRange,
  formatWeekday,
} from "@/lib/scheduleFormat";

describe("formatWeekday", () => {
  it.each([
    ["en-AU", 0, "Sun"],
    ["en-AU", 2, "Tue"],
    ["en-AU", 6, "Sat"],
    ["zh-CN", 0, "周日"],
    ["zh-CN", 2, "周二"],
  ] as const)("formats %s weekday %i as %s", (locale, day, label) => {
    expect(formatWeekday(day, locale)).toBe(label);
  });
});

describe("formatMinutesOfDay", () => {
  it.each([
    ["en-AU", 0, "12:00 am"],
    ["en-AU", 1080, "6:00 pm"],
    ["en-AU", 1440, "12:00 am"],
    ["zh-CN", 1080, "18:00"],
    ["zh-CN", 1440, "0:00"],
  ])("formats %s minute %i as %s", (locale, minutes, label) => {
    expect(formatMinutesOfDay(minutes, locale)).toBe(label);
  });
});

const formatEnglishNextDay = (time: string) => `${time} (next day)`;
const formatChineseNextDay = (time: string) => `${time}（次日）`;

describe("formatDashboardCardSchedule", () => {
  it.each([
    ["en-AU", formatEnglishNextDay, "Tue, Thu · 6:00 pm – 8:00 pm"],
    ["zh-CN", formatChineseNextDay, "周二、周四 · 18:00 – 20:00"],
  ])(
    "formats a two-day evening schedule in %s",
    (locale, formatNextDayTime, label) => {
      expect(
        formatDashboardCardSchedule(
          { weekdays: [4, 2], startMinutes: 1080, endMinutes: 1200 },
          locale,
          formatNextDayTime,
        ),
      ).toBe(label);
    },
  );

  it.each([
    ["en-AU", formatEnglishNextDay, "Sat · 9:00 pm – 12:00 am (next day)"],
    ["zh-CN", formatChineseNextDay, "周六 · 21:00 – 0:00（次日）"],
  ])(
    "marks a schedule ending at midnight as next day in %s",
    (locale, formatNextDayTime, label) => {
      expect(
        formatDashboardCardSchedule(
          { weekdays: [6], startMinutes: 1260, endMinutes: 1440 },
          locale,
          formatNextDayTime,
        ),
      ).toBe(label);
    },
  );

  it("does not mark a schedule starting at midnight as next day", () => {
    expect(
      formatDashboardCardSchedule(
        { weekdays: [1], startMinutes: 0, endMinutes: 120 },
        "en-AU",
        formatEnglishNextDay,
      ),
    ).toBe("Mon · 12:00 am – 2:00 am");
  });

  it("does not reorder the schedule it was given", () => {
    const schedule = {
      weekdays: [4, 2] as const,
      startMinutes: 1080,
      endMinutes: 1200,
    };

    formatDashboardCardSchedule(schedule, "en-AU", formatEnglishNextDay);

    expect(schedule.weekdays).toEqual([4, 2]);
  });
});

describe("formatScheduledWindowTimeRange", () => {
  const sydneyEveningWindow = {
    localDate: "2026-09-15",
    timeZone: "Australia/Sydney",
    startUtc: "2026-09-15T08:00:00.000Z",
    endUtc: "2026-09-15T10:00:00.000Z",
  };
  const sydneyMidnightWindow = {
    localDate: "2026-09-15",
    timeZone: "Australia/Sydney",
    startUtc: "2026-09-15T11:00:00.000Z",
    endUtc: "2026-09-15T14:00:00.000Z",
  };

  it.each([
    ["en-AU", formatEnglishNextDay, "6:00 pm – 8:00 pm"],
    ["zh-CN", formatChineseNextDay, "18:00 – 20:00"],
  ])("formats a same-day range in %s", (locale, formatNextDayTime, label) => {
    expect(
      formatScheduledWindowTimeRange(
        sydneyEveningWindow,
        locale,
        formatNextDayTime,
      ),
    ).toBe(label);
  });

  it.each([
    ["en-AU", formatEnglishNextDay, "9:00 pm – 12:00 am (next day)"],
    ["zh-CN", formatChineseNextDay, "21:00 – 0:00（次日）"],
  ])(
    "marks a range ending at the next midnight in %s",
    (locale, formatNextDayTime, label) => {
      expect(
        formatScheduledWindowTimeRange(
          sydneyMidnightWindow,
          locale,
          formatNextDayTime,
        ),
      ).toBe(label);
    },
  );
});
