import { describe, expect, it } from "vitest";
import { getRiskColor } from "@/domain/riskRegistry";
import {
  buildRiskGaugeOption,
  formatRiskGaugeValue,
  getRiskGaugeActiveLevel,
  getRiskGaugeGeometry,
  getRiskGaugePointerAngle,
  getRiskGaugeValueLayout,
  getRiskGaugeWidth,
  normalizeRiskGaugeScore,
  RISK_GAUGE_MAX_WIDTH,
  RISK_GAUGE_MIN_WIDTH,
} from "@/lib/riskGauge";

const riskGaugeLabels = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  extreme: "Extreme",
};

function getGraphicElements(option: ReturnType<typeof buildRiskGaugeOption>) {
  return !Array.isArray(option.graphic) && option.graphic
    ? ((option.graphic as { elements?: unknown[] }).elements ?? [])
    : [];
}

describe("riskGauge helpers", () => {
  it("maps threshold scores to the expected active levels", () => {
    expect(getRiskGaugeActiveLevel(0)).toBe("low");
    expect(getRiskGaugeActiveLevel(1)).toBe("moderate");
    expect(getRiskGaugeActiveLevel(2)).toBe("high");
    expect(getRiskGaugeActiveLevel(3)).toBe("extreme");
    expect(getRiskGaugeActiveLevel(4)).toBe("extreme");
  });

  it("maps threshold scores to the expected pointer angles", () => {
    expect(getRiskGaugePointerAngle(0)).toBe(180);
    expect(getRiskGaugePointerAngle(1)).toBe(135);
    expect(getRiskGaugePointerAngle(2)).toBe(90);
    expect(getRiskGaugePointerAngle(3)).toBe(45);
    expect(getRiskGaugePointerAngle(4)).toBe(0);
  });

  it("clamps out-of-range scores and falls back to N/A for unavailable values", () => {
    expect(normalizeRiskGaugeScore(-1)).toBe(0);
    expect(normalizeRiskGaugeScore(6)).toBe(4);
    expect(getRiskGaugePointerAngle(Number.NaN)).toBeNull();
    expect(formatRiskGaugeValue(Number.NaN, "N/A")).toBe("N/A");
  });

  it("resolves default and clamped gauge widths from a single helper", () => {
    expect(getRiskGaugeWidth()).toBe(RISK_GAUGE_MAX_WIDTH);
    expect(getRiskGaugeWidth(true)).toBe(RISK_GAUGE_MIN_WIDTH);
    expect(getRiskGaugeWidth(false, 120)).toBe(RISK_GAUGE_MIN_WIDTH);
    expect(getRiskGaugeWidth(false, 280)).toBe(280);
    expect(getRiskGaugeWidth(false, 480)).toBe(RISK_GAUGE_MAX_WIDTH);
    expect(getRiskGaugeWidth(true, Number.NaN)).toBe(RISK_GAUGE_MIN_WIDTH);
  });

  it("builds a semicircle echarts gauge with legacy-style band labels", () => {
    const option = buildRiskGaugeOption(
      2.4,
      riskGaugeLabels,
      "Heat Score",
      "N/A",
      false,
      400,
    );
    const [bandSeries, overlaySeries] = Array.isArray(option.series)
      ? option.series
      : [];
    const graphicElements = getGraphicElements(option);
    const geometry = getRiskGaugeGeometry(false, 400);

    expect(bandSeries).toMatchObject({
      type: "gauge",
      startAngle: 180,
      endAngle: 0,
      center: [200, geometry.centerY],
      radius: geometry.radius,
      splitNumber: 4,
      pointer: {
        show: false,
      },
      splitLine: {
        show: false,
      },
      data: [{ value: 2.4 }],
    });
    expect(overlaySeries).toMatchObject({
      type: "gauge",
      startAngle: 180,
      endAngle: 0,
      center: [200, geometry.centerY],
      radius: geometry.radius,
      splitNumber: 8,
      axisLabel: {
        show: true,
        rotate: "tangential",
      },
      pointer: {
        show: false,
      },
      detail: {
        show: false,
      },
      title: {
        show: false,
      },
      data: [{ value: 2.4 }],
    });
    expect(graphicElements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "polygon",
          style: expect.objectContaining({
            fill: getRiskColor("high"),
          }),
        }),
      ]),
    );
  });

  it("derives tighter chart geometry from the clamped gauge width", () => {
    expect(getRiskGaugeGeometry(false, 200)).toEqual({
      bottomInset: 4,
      centerY: 98,
      height: 102,
      radius: 90,
      sideInset: 10,
      topInset: 8,
      valueBottomOffset: 4,
      width: 200,
    });
    expect(getRiskGaugeGeometry(false, 400)).toEqual({
      bottomInset: 8,
      centerY: 202,
      height: 210,
      radius: 190,
      sideInset: 10,
      topInset: 12,
      valueBottomOffset: 6,
      width: 400,
    });
    expect(getRiskGaugeGeometry(false, 200).height).toBeLessThan(116);
    expect(getRiskGaugeGeometry(false, 400).height).toBeLessThan(232);
  });

  it("returns responsive overlay font sizing for the center value", () => {
    expect(getRiskGaugeValueLayout(2.4, false, 200)).toEqual({
      bottomOffset: 4,
      fontSize: 32,
      fontWeight: 800,
      lineHeight: 0.82,
    });
    expect(getRiskGaugeValueLayout(2.4, false, 400)).toEqual({
      bottomOffset: 6,
      fontSize: 48,
      fontWeight: 800,
      lineHeight: 0.82,
    });
    expect(getRiskGaugeValueLayout(Number.NaN, false, 400)).toEqual({
      bottomOffset: 6,
      fontSize: 24,
      fontWeight: 800,
      lineHeight: 0.82,
    });
  });

  it("keeps the chart graphic free of center text so DOM can control alignment", () => {
    const option = buildRiskGaugeOption(
      2.4,
      riskGaugeLabels,
      "Heat Score",
      "N/A",
      false,
      400,
    );

    expect(getGraphicElements(option)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "text",
        }),
      ]),
    );
  });

  it("hides the pointer and shows N/A when the score is unavailable", () => {
    const option = buildRiskGaugeOption(
      Number.NaN,
      riskGaugeLabels,
      "Heat Score",
      "N/A",
      false,
      400,
    );
    const [, overlaySeries] = Array.isArray(option.series) ? option.series : [];
    const graphicElements = getGraphicElements(option);

    expect(overlaySeries).toMatchObject({
      pointer: {
        show: false,
      },
      detail: {
        show: false,
      },
      data: [{ value: 0 }],
    });
    expect(graphicElements).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "polygon",
        }),
      ]),
    );
    expect(graphicElements).toEqual([]);
  });
});
