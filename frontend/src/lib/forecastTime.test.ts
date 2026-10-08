import { describe, expect, it } from "vitest";
import {
  formatForecastMinutesLabel,
  parseForecastTimeToMinutes,
  toForecastTimePoints,
} from "@/lib/forecastTime";

describe("parseForecastTimeToMinutes", () => {
  it("returns minutes past midnight for well-formed labels", () => {
    expect(parseForecastTimeToMinutes("00:00")).toBe(0);
    expect(parseForecastTimeToMinutes("14:30")).toBe(870);
    expect(parseForecastTimeToMinutes("23:59")).toBe(1439);
  });

  it("rejects labels outside the 24-hour format", () => {
    expect(parseForecastTimeToMinutes("24:00")).toBeNull();
    expect(parseForecastTimeToMinutes("9:00")).toBeNull();
    expect(parseForecastTimeToMinutes("")).toBeNull();
  });
});

describe("formatForecastMinutesLabel", () => {
  it("follows the clock convention of the locale", () => {
    expect(formatForecastMinutesLabel(540, "en-AU")).toBe("9 am");
    expect(formatForecastMinutesLabel(540, "zh-CN")).toBe("9时");
  });

  it("formats whole hours without minutes", () => {
    expect(formatForecastMinutesLabel(0, "en-AU")).toBe("12 am");
    expect(formatForecastMinutesLabel(720, "en-AU")).toBe("12 pm");
    expect(formatForecastMinutesLabel(1380, "en-AU")).toBe("11 pm");
  });

  it("keeps minutes and wraps past a full day", () => {
    expect(formatForecastMinutesLabel(870, "en-AU")).toBe("2:30 pm");
    expect(formatForecastMinutesLabel(1500, "en-AU")).toBe("1 am");
  });

  it("falls back to the default locale rather than throwing", () => {
    expect(() => formatForecastMinutesLabel(540, "not a locale")).not.toThrow();
  });
});

describe("toForecastTimePoints", () => {
  it("keeps parsed offsets while they advance", () => {
    expect(toForecastTimePoints(["08:00", "09:00", "10:30"])).toEqual([
      { minuteOffset: 480, statedMinutes: 480 },
      { minuteOffset: 540, statedMinutes: 540 },
      { minuteOffset: 630, statedMinutes: 630 },
    ]);
  });

  it("advances the offset past midnight while keeping the stated time", () => {
    expect(toForecastTimePoints(["22:00", "23:00", "00:00"])).toEqual([
      { minuteOffset: 1320, statedMinutes: 1320 },
      { minuteOffset: 1380, statedMinutes: 1380 },
      { minuteOffset: 1440, statedMinutes: 0 },
    ]);
  });

  it("separates the plotted offset from a repeated hour", () => {
    // The hour that comes back when daylight saving ends: the chart has to
    // place the second 02:00 after the first, but it is still 2 am.
    expect(toForecastTimePoints(["01:00", "02:00", "02:00", "03:00"])).toEqual([
      { minuteOffset: 60, statedMinutes: 60 },
      { minuteOffset: 120, statedMinutes: 120 },
      { minuteOffset: 180, statedMinutes: 120 },
      { minuteOffset: 240, statedMinutes: 180 },
    ]);
  });

  it("reports no stated time for a malformed label", () => {
    expect(toForecastTimePoints(["08:00", "broken", "10:00"])).toEqual([
      { minuteOffset: 480, statedMinutes: 480 },
      { minuteOffset: 540, statedMinutes: null },
      { minuteOffset: 600, statedMinutes: 600 },
    ]);
  });

  it("starts at midnight when the first label is malformed", () => {
    expect(toForecastTimePoints(["broken", "01:00"])).toEqual([
      { minuteOffset: 0, statedMinutes: null },
      { minuteOffset: 60, statedMinutes: 60 },
    ]);
  });

  it("returns nothing for an empty day", () => {
    expect(toForecastTimePoints([])).toEqual([]);
  });
});
