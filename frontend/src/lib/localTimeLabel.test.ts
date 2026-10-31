import { describe, expect, it } from "vitest";
import { formatLocalTimeLabel } from "@/lib/localTimeLabel";

describe("formatLocalTimeLabel", () => {
  it("formats on-the-hour times without minutes", () => {
    expect(formatLocalTimeLabel("00:00", "en-AU")).toBe("12 am");
    expect(formatLocalTimeLabel("12:00", "en-AU")).toBe("12 pm");
    expect(formatLocalTimeLabel("13:00", "en-AU")).toBe("1 pm");
    expect(formatLocalTimeLabel("22:00", "en-AU")).toBe("10 pm");
  });

  it("formats times with minutes", () => {
    expect(formatLocalTimeLabel("06:12", "en-AU")).toBe("6:12 am");
    expect(formatLocalTimeLabel("18:48", "en-AU")).toBe("6:48 pm");
  });

  it("follows the clock convention of the selected language", () => {
    expect(formatLocalTimeLabel("14:00", "zh-CN")).toBe("14时");
  });

  it("returns the input when it is not HH:MM", () => {
    expect(formatLocalTimeLabel("not-a-time", "en-AU")).toBe("not-a-time");
  });
});
