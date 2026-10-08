import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { formatRiskScore } from "@/domain/riskRegistry";
import { buildForecastSummary } from "@/lib/forecastSummary";
import en from "@/i18n/locales/en/translation.json";
import zh from "@/i18n/locales/zh-CN/translation.json";

describe("buildForecastSummary", () => {
  it("returns null endpoints for an empty day", () => {
    expect(buildForecastSummary([], "en-AU")).toEqual({
      rows: [],
      endpoints: null,
    });
  });
  it("uses a single point for every endpoint", () => {
    const row = { time: "2:30 pm", level: "high", score: 3.24 };
    expect(
      buildForecastSummary([{ time: "14:30", value: 3.24 }], "en-AU"),
    ).toEqual({
      rows: [row],
      endpoints: { peak: row, first: row, last: row },
    });
  });
  it("preserves detail, risk thresholds and endpoints without changing input", () => {
    const points = [
      { time: "00:00", value: 1.9 },
      { time: "06:00", value: 2 },
      { time: "12:00", value: 3 },
      { time: "18:00", value: 4 },
      { time: "23:00", value: 2.5 },
    ];
    const original = structuredClone(points);
    points.forEach(Object.freeze);
    Object.freeze(points);
    const result = buildForecastSummary(points, "en-AU");
    expect(result.rows.map((row) => row.level)).toEqual([
      "low",
      "moderate",
      "high",
      "extreme",
      "moderate",
    ]);
    expect(result.rows.map((row) => row.time)).toEqual([
      "12 am",
      "6 am",
      "12 pm",
      "6 pm",
      "11 pm",
    ]);
    expect(result.endpoints?.peak).toEqual(result.rows[3]);
    expect(result.endpoints?.first).toEqual(result.rows[0]);
    expect(result.endpoints?.last).toEqual(result.rows[4]);
    expect(points).toEqual(original);
  });
  it("reads times in the selected language", () => {
    const result = buildForecastSummary(
      [
        { time: "09:00", value: 1 },
        { time: "14:00", value: 2 },
      ],
      "zh-CN",
    );

    expect(result.rows.map((row) => row.time)).toEqual(["9时", "14时"]);
  });
  it("compares raw scores and keeps the first equal maximum", () => {
    const result = buildForecastSummary(
      [
        { time: "09:00", value: 3.21 },
        { time: "10:00", value: 3.24 },
        { time: "11:00", value: 3.24 },
      ],
      "en-AU",
    );
    expect(result.endpoints?.peak).toEqual({
      time: "10 am",
      level: "high",
      score: 3.24,
    });
  });
  it("keeps the risk band off the rounded score", () => {
    const peak = buildForecastSummary([{ time: "12:00", value: 2.99 }], "en-AU")
      .endpoints?.peak;

    expect(peak).toEqual({ time: "12 pm", level: "moderate", score: 2.99 });
    expect(formatRiskScore(peak!.score)).toBe("3.0");
  });
  it("names a repeated hour as itself, not as its chart position", () => {
    // The hour that comes back when daylight saving ends. The chart has to
    // place the second 02:00 after the first; the text must not report it as
    // 3 am, and the peak must be named with the hour it actually fell in.
    const result = buildForecastSummary(
      [
        { time: "01:00", value: 1 },
        { time: "02:00", value: 2 },
        { time: "02:00", value: 4 },
        { time: "03:00", value: 3 },
      ],
      "en-AU",
    );

    expect(result.rows.map((row) => row.time)).toEqual([
      "1 am",
      "2 am",
      "2 am",
      "3 am",
    ]);
    expect(result.endpoints?.peak?.time).toBe("2 am");
  });
  it("falls back to the chart position when a label cannot be read", () => {
    expect(
      buildForecastSummary(
        [
          { time: "23:00", value: 2 },
          { time: "00:00", value: 2 },
          { time: "invalid", value: 2 },
        ],
        "en-AU",
      ).rows.map((row) => row.time),
    ).toEqual(["11 pm", "12 am", "1 am"]);
    expect(
      buildForecastSummary([{ time: "invalid", value: 1 }], "en-AU").endpoints
        ?.first.time,
    ).toBe("12 am");
  });
});

describe("forecast accessibility translations", () => {
  it.each(["en", "zh-CN"])(
    "renders summary and table labels in %s",
    async (language) => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        resources: { en: { translation: en }, "zh-CN": { translation: zh } },
      });
      const level = i18n.t("risk.level.high");
      const label = i18n.t("charts.forecast.a11y.chartLabel", {
        day: "2026-09-19",
        peakLevel: level,
        peakTime: "12 pm",
        startLevel: level,
        endLevel: level,
      });
      expect(label).toContain("2026-09-19");
      expect(label).toContain("12 pm");
      expect(label).toContain(level);
      expect(label).not.toMatch(/\{\{|undefined|charts\.forecast/);
      expect(
        i18n.t("charts.forecast.a11y.tableCaption", { day: "2026-09-19" }),
      ).toContain("2026-09-19");
      for (const key of ["timeHeader", "levelHeader", "valueHeader"]) {
        expect(i18n.exists(`charts.forecast.a11y.${key}`)).toBe(true);
      }
    },
  );
});
