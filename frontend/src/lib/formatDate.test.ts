import { describe, expect, it } from "vitest";
import { toIntlLocale } from "@/i18n/language";
import { formatDateLabel, formatWeekdayLabel } from "@/lib/formatDate";

describe("localized forecast dates", () => {
  const date = "2026-08-19T00:00:00Z";
  const timeZone = "Australia/Sydney";

  it("formats weekday and date labels in Simplified Chinese without repeating the weekday", () => {
    const locale = toIntlLocale("zh-CN");

    expect(formatWeekdayLabel(date, { locale, timeZone })).toBe("星期三");
    expect(formatDateLabel(date, { locale, timeZone })).toBe("8月19日");
  });

  it("keeps Australian English date order when the app language is English", () => {
    const locale = toIntlLocale("en");

    expect(formatWeekdayLabel(date, { locale, timeZone })).toBe("Wednesday");
    expect(formatDateLabel(date, { locale, timeZone })).toBe("19 Aug");
  });

  it("keeps English as the default locale", () => {
    expect(formatWeekdayLabel(date, { timeZone })).toBe("Wednesday");
    expect(formatDateLabel(date, { timeZone })).toBe("19 Aug");
  });
});
