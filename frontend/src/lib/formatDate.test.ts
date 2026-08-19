import { describe, expect, it } from "vitest";
import { formatDateLabel, formatWeekdayLabel } from "@/lib/formatDate";

describe("localized forecast dates", () => {
  const date = "2026-08-19T00:00:00Z";

  it("formats weekday and date labels in Simplified Chinese", () => {
    expect(
      formatWeekdayLabel(date, {
        locale: "zh-CN",
        timeZone: "Australia/Sydney",
      }),
    ).toBe("星期三");
    expect(
      formatDateLabel(date, {
        locale: "zh-CN",
        timeZone: "Australia/Sydney",
      }),
    ).toMatch(/8月19日/);
  });

  it("keeps English as the default locale", () => {
    expect(formatWeekdayLabel(date, { timeZone: "Australia/Sydney" })).toBe(
      "Wednesday",
    );
  });
});
