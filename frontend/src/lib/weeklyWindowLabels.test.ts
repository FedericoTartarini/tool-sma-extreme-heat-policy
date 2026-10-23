import { describe, expect, it } from "vitest";
import { formatWeeklyForecastTime } from "@/lib/weeklyWindowLabels";

describe("backend-local forecast labels", () => {
  it.each([
    ["en-AU", "2026-09-15T18:00:00+10:00", "6:00 pm", "2026-09-15"],
    ["zh-CN", "2026-09-15T18:00:00+10:00", "18:00", "2026-09-15"],
    ["en-AU", "2026-09-16T00:00:00+10:00", "12:00 am", "2026-09-16"],
    ["en-AU", "2026-09-15T18:00:00+05:45", "6:00 pm", "2026-09-15"],
  ])(
    "preserves local wall time for %s / %s",
    (locale, value, label, dateKey) => {
      expect(formatWeeklyForecastTime(value, locale)).toEqual({
        label,
        dateKey,
      });
    },
  );
  it("rejects an invalid or offset-free local timestamp", () => {
    expect(formatWeeklyForecastTime("invalid", "en-AU")).toBeNull();
    expect(formatWeeklyForecastTime("2026-09-15T18:00:00", "en-AU")).toBeNull();
  });
});
