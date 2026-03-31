import { describe, expect, it } from "vitest";
import { USYD_ORANGE_HEX } from "@/config/uiColors";
import { buildForecastOption } from "@/lib/riskCharts";

const forecastLabels = {
  xAxisName: "Time",
  yAxisRiskName: "Risk level",
  tooltipRiskLabel: "Risk",
  riskLevelLong: {
    low: "Low",
    moderate: "Moderate",
    high: "High",
    extreme: "Extreme",
  },
};

describe("buildForecastOption", () => {
  it("adds threshold crossing points to the visual forecast series", () => {
    const option = buildForecastOption(
      [
        { time: "08:00", value: 0.5 },
        { time: "09:00", value: 2.5 },
      ],
      forecastLabels,
      "Today",
    );
    const series = Array.isArray(option.series) ? option.series : [];
    const visualSeries = series.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        entry.name === "Risk-visual",
    );
    const tooltipSeries = series.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        entry.name === "Risk",
    );
    const pointSeries = series.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        entry.name === "Risk-points",
    );
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
    const yAxes = Array.isArray(option.yAxis) ? option.yAxis : [];
    const categoryYAxis = yAxes[1];

    expect(series).toHaveLength(8);
    expect(option.title).toMatchObject({
      text: "Today",
      textStyle: { fontSize: 14, fontWeight: 600 },
    });
    expect(option.grid).toMatchObject({
      left: 10,
      right: 16,
      top: 2,
      bottom: 16,
      containLabel: true,
    });
    expect(xAxis).toMatchObject({
      min: 480,
      max: 540,
      name: "Time",
      nameGap: 46,
      nameTextStyle: { fontSize: 12, fontWeight: 400 },
      axisLabel: { fontSize: 12 },
    });
    expect(categoryYAxis).toMatchObject({
      nameGap: 16,
      nameTextStyle: { fontSize: 12, fontWeight: 400 },
      axisLabel: { fontSize: 12, margin: 8 },
    });
    expect(visualSeries).toMatchObject({
      data: [
        [480, 0.5],
        [495, 1],
        [525, 2],
        [540, 2.5],
      ],
    });
    expect(tooltipSeries).toMatchObject({
      data: [
        [480, 0.5],
        [540, 2.5],
      ],
    });
    expect(pointSeries).toMatchObject({
      symbol: "circle",
      symbolSize: 6,
      data: [
        [480, 0.5],
        [540, 2.5],
      ],
    });
  });

  it("renders zero-risk forecasts with the standard line styling and point markers", () => {
    const option = buildForecastOption(
      [
        { time: "08:00", value: 0 },
        { time: "09:00", value: 0 },
      ],
      forecastLabels,
    );
    const series = Array.isArray(option.series) ? option.series : [];
    const visualSeries = series.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        entry.name === "Risk-visual",
    );
    const pointSeries = series.find(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        entry.name === "Risk-points",
    );
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
    const yAxes = Array.isArray(option.yAxis) ? option.yAxis : [];
    const categoryYAxis = yAxes[1];

    expect(option.grid).toMatchObject({
      left: 10,
      right: 16,
      top: 2,
      bottom: 16,
      containLabel: true,
    });
    expect(xAxis).toMatchObject({
      nameGap: 46,
    });
    expect(categoryYAxis).toMatchObject({
      nameGap: 16,
      axisLabel: { margin: 8 },
    });
    expect(visualSeries).toMatchObject({
      showSymbol: false,
      symbolSize: 0,
      lineStyle: { color: USYD_ORANGE_HEX },
      itemStyle: { color: USYD_ORANGE_HEX },
    });
    expect(pointSeries).toMatchObject({
      symbol: "circle",
      symbolSize: 6,
      itemStyle: { color: USYD_ORANGE_HEX },
      data: [
        [480, 0],
        [540, 0],
      ],
    });
  });

  it("keeps mobile x-axis labels on a regular cadence", () => {
    const option = buildForecastOption(
      [
        { time: "18:00", value: 0 },
        { time: "19:00", value: 0.2 },
        { time: "20:00", value: 0.3 },
        { time: "21:00", value: 0.4 },
        { time: "22:00", value: 0.3 },
        { time: "23:00", value: 0.1 },
      ],
      forecastLabels,
      undefined,
      true,
    );
    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
    const formatter =
      xAxis && typeof xAxis === "object" && "axisLabel" in xAxis
        ? xAxis.axisLabel?.formatter
        : undefined;

    expect(xAxis).toMatchObject({
      min: 1080,
      max: 1380,
      interval: 120,
      nameGap: 46,
    });
    expect(option.grid).toMatchObject({
      left: 10,
      right: 16,
      top: 2,
      bottom: 16,
      containLabel: true,
    });
    expect(typeof formatter).toBe("function");

    const formatTickLabel = formatter as (value: number) => string;

    expect(formatTickLabel(1080)).toBe("6 PM");
    expect(formatTickLabel(1200)).toBe("8 PM");
    expect(formatTickLabel(1320)).toBe("10 PM");
    expect(formatTickLabel(1380)).toBe("");
  });
});
