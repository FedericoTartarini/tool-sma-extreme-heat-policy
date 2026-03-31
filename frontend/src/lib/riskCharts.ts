import { lighten } from "@mantine/core";
import type {
  EChartsOption,
  EChartsType,
  TooltipComponentFormatterCallbackParams,
} from "echarts";
import { toRiskLevel, type ForecastPoint, type RiskLevel } from "@/domain/risk";
import { USYD_ORANGE_HEX } from "@/config/uiColors";
import {
  getRiskBands,
  getRiskColor,
  MAX_RISK_SCORE,
} from "@/domain/riskRegistry";

const FORECAST_LINE_COLOR = USYD_ORANGE_HEX;
const FORECAST_BAND_WHITE_MIX = 0.15;
const FORECAST_VISUAL_SERIES_ID = "forecast-visual-line";
const FORECAST_POINT_SERIES_ID = "forecast-data-points";
const FORECAST_TOOLTIP_SERIES_ID = "forecast-tooltip-line";
const FORECAST_HIGHLIGHT_SERIES_ID = "forecast-highlight-point";
const FORECAST_HOUR_MINUTE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const FORECAST_DISPLAY_PRECISION = 1;
const FORECAST_AXIS_ALIGNMENT_EPSILON = 0.001;
const FORECAST_POINT_SYMBOL_SIZE = 6;

type ChartTypography = {
  forecastTitle: number;
  axis: number;
  riskBandAxis: number;
  xAxisIntervalMinutes: number;
};

type ForecastLayout = {
  gridLeft: number;
  gridRight: number;
  gridBottom: number;
  xAxisNameGap: number;
  yAxisNameGap: number;
  axisLabelMargin: number;
};

const CHART_TYPOGRAPHY: Record<"mobile" | "desktop", ChartTypography> = {
  mobile: {
    forecastTitle: 14,
    axis: 12,
    riskBandAxis: 12,
    xAxisIntervalMinutes: 120,
  },
  desktop: {
    forecastTitle: 14,
    axis: 12,
    riskBandAxis: 12,
    xAxisIntervalMinutes: 60,
  },
};

const FORECAST_LAYOUT: ForecastLayout = {
  gridLeft: 10,
  gridRight: 16,
  gridBottom: 16,
  xAxisNameGap: 46,
  yAxisNameGap: 16,
  axisLabelMargin: 8,
};

interface ForecastLabels {
  xAxisName: string;
  yAxisRiskName: string;
  tooltipRiskLabel: string;
  riskLevelLong: Record<RiskLevel, string>;
}

interface ForecastChartPoint extends ForecastPoint {
  minuteOffset: number;
}

interface ForecastAxisPointerInfo {
  axisDim?: string;
  value?: unknown;
}

interface ForecastAxisPointerEvent {
  axesInfo?: ForecastAxisPointerInfo[];
}

function getTypography(isMobile: boolean): ChartTypography {
  return isMobile ? CHART_TYPOGRAPHY.mobile : CHART_TYPOGRAPHY.desktop;
}

function getBandUpperValue(value: number, upper: number): number {
  return Math.max(0, Math.min(value, upper));
}

function parseForecastTimeToMinutes(rawTime: string): number | null {
  const match = FORECAST_HOUR_MINUTE_PATTERN.exec(rawTime);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatForecastMinutesLabel(rawMinutes: number): string {
  const roundedMinutes = Math.round(rawMinutes);
  const minutesInDay = 24 * 60;
  const normalizedMinutes =
    ((roundedMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  if (minute === 0) {
    return `${hour12} ${meridiem}`;
  }

  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function toForecastCoordinatePoints(
  points: ForecastPoint[],
): ForecastChartPoint[] {
  if (points.length === 0) {
    return [];
  }

  let previousMinuteOffset = -1;

  return points.map<ForecastChartPoint>((point) => {
    const parsedMinuteOffset = parseForecastTimeToMinutes(point.time);
    const minuteOffset =
      parsedMinuteOffset !== null && parsedMinuteOffset > previousMinuteOffset
        ? parsedMinuteOffset
        : previousMinuteOffset < 0
          ? (parsedMinuteOffset ?? 0)
          : previousMinuteOffset + 60;

    previousMinuteOffset = minuteOffset;

    return {
      ...point,
      minuteOffset,
    };
  });
}

function toForecastChartPoints(
  points: ForecastChartPoint[],
): ForecastChartPoint[] {
  if (points.length === 0) {
    return [];
  }

  const thresholds = getRiskBands()
    .map((band) => band.upper)
    .filter((threshold) => threshold > 0 && threshold < MAX_RISK_SCORE);
  const expandedPoints: ForecastChartPoint[] = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const nextPoint = points[index];
    const valueDelta = nextPoint.value - previousPoint.value;
    const minuteDelta = nextPoint.minuteOffset - previousPoint.minuteOffset;

    if (valueDelta !== 0 && minuteDelta > 0) {
      const crossingPoints = thresholds
        .filter((threshold) => {
          const lowerValue = Math.min(previousPoint.value, nextPoint.value);
          const upperValue = Math.max(previousPoint.value, nextPoint.value);

          return threshold > lowerValue && threshold < upperValue;
        })
        .map((threshold) => ({
          threshold,
          ratio: (threshold - previousPoint.value) / valueDelta,
        }))
        .filter(({ ratio }) => ratio > 0 && ratio < 1)
        .sort((left, right) => left.ratio - right.ratio);

      for (const crossingPoint of crossingPoints) {
        const minuteOffset =
          previousPoint.minuteOffset + minuteDelta * crossingPoint.ratio;

        expandedPoints.push({
          time: formatForecastMinutesLabel(minuteOffset),
          value: crossingPoint.threshold,
          minuteOffset,
        });
      }
    }

    expandedPoints.push(nextPoint);
  }

  return expandedPoints;
}

function findNearestForecastPoint(
  points: ForecastChartPoint[],
  minuteOffset: number,
): ForecastChartPoint | null {
  const firstPoint = points[0];

  if (!firstPoint) {
    return null;
  }

  let nearestPoint = firstPoint;
  let nearestDistance = Math.abs(firstPoint.minuteOffset - minuteOffset);

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const distance = Math.abs(point.minuteOffset - minuteOffset);

    if (
      distance < nearestDistance ||
      (distance === nearestDistance &&
        point.minuteOffset < nearestPoint.minuteOffset)
    ) {
      nearestPoint = point;
      nearestDistance = distance;
    }
  }

  return nearestPoint;
}

function toForecastPointDatum(point: ForecastChartPoint): [number, number] {
  return [point.minuteOffset, point.value];
}

function isForecastAxisTickAligned(
  value: number,
  anchor: number,
  interval: number,
): boolean {
  const remainder = (value - anchor) % interval;

  return (
    Math.abs(remainder) < FORECAST_AXIS_ALIGNMENT_EPSILON ||
    Math.abs(remainder - interval) < FORECAST_AXIS_ALIGNMENT_EPSILON
  );
}

function updateForecastHighlightPoint(
  chart: EChartsType,
  point: ForecastChartPoint | null,
) {
  chart.setOption({
    series: [
      {
        id: FORECAST_HIGHLIGHT_SERIES_ID,
        type: "scatter",
        data: point ? [toForecastPointDatum(point)] : [],
      },
    ],
  });
}

export function bindForecastHoverPoint(
  chart: EChartsType,
  container: HTMLDivElement,
  points: ForecastPoint[],
) {
  const forecastPoints = toForecastCoordinatePoints(points);
  let highlightedMinuteOffset: number | null = null;

  const handleAxisPointerUpdate = (event: unknown) => {
    const axisPointerEvent =
      typeof event === "object" && event !== null
        ? (event as ForecastAxisPointerEvent)
        : {};
    const xAxisInfo = axisPointerEvent.axesInfo?.find(
      (axis) => axis.axisDim === "x",
    );
    const numericAxisValue =
      typeof xAxisInfo?.value === "number"
        ? xAxisInfo.value
        : Number(xAxisInfo?.value);

    if (!Number.isFinite(numericAxisValue)) {
      return;
    }

    const nearestPoint = findNearestForecastPoint(
      forecastPoints,
      numericAxisValue,
    );

    if (
      !nearestPoint ||
      nearestPoint.minuteOffset === highlightedMinuteOffset
    ) {
      return;
    }

    highlightedMinuteOffset = nearestPoint.minuteOffset;
    updateForecastHighlightPoint(chart, nearestPoint);
  };

  const clearHighlightPoint = () => {
    if (highlightedMinuteOffset === null) {
      return;
    }

    highlightedMinuteOffset = null;
    updateForecastHighlightPoint(chart, null);
  };

  chart.on("updateAxisPointer", handleAxisPointerUpdate);
  container.addEventListener("mouseleave", clearHighlightPoint);

  return () => {
    chart.off("updateAxisPointer", handleAxisPointerUpdate);
    container.removeEventListener("mouseleave", clearHighlightPoint);
    clearHighlightPoint();
  };
}

function toRiskBandValues(
  points: ForecastChartPoint[],
  upper: number,
): Array<[number, number]> {
  return points.map((point) => [
    point.minuteOffset,
    getBandUpperValue(point.value, upper),
  ]);
}

function toRiskBandSeries(points: ForecastChartPoint[]) {
  const bands = getRiskBands();

  return bands.map((band, index) => ({
    name: band.level,
    type: "line" as const,
    yAxisIndex: 0,
    z: bands.length - index,
    silent: true,
    showSymbol: false,
    lineStyle: { width: 0, opacity: 0 },
    areaStyle: {
      color: lighten(band.color, FORECAST_BAND_WHITE_MIX),
      opacity: 1,
    },
    emphasis: { disabled: true },
    tooltip: { show: false },
    data: toRiskBandValues(points, band.upper),
  }));
}

function formatForecastTimeLabel(rawTime: string): string {
  const minuteOffset = parseForecastTimeToMinutes(rawTime);
  if (minuteOffset === null) {
    return rawTime;
  }

  return formatForecastMinutesLabel(minuteOffset);
}

function formatForecastTooltip(
  params: TooltipComponentFormatterCallbackParams,
  tooltipRiskLabel: string,
  forecastPoints: ForecastChartPoint[],
): string {
  const items = Array.isArray(params) ? params : [params];
  const firstItem = items[0];
  if (!firstItem) {
    return "";
  }

  const axisValue = (firstItem as typeof firstItem & { axisValue?: unknown })
    .axisValue;
  const numericAxisValue =
    typeof axisValue === "number" ? axisValue : Number(axisValue);
  const nearestPoint = Number.isFinite(numericAxisValue)
    ? findNearestForecastPoint(forecastPoints, numericAxisValue)
    : null;
  const formattedTime = nearestPoint
    ? formatForecastMinutesLabel(nearestPoint.minuteOffset)
    : formatForecastTimeLabel(String(firstItem.name ?? ""));
  const rawValue = nearestPoint
    ? nearestPoint.value
    : Array.isArray(firstItem.value)
      ? firstItem.value[1]
      : firstItem.value;
  const numericValue =
    typeof rawValue === "number" ? rawValue : Number(rawValue);
  const lineColor = FORECAST_LINE_COLOR;
  const markerColor = Number.isFinite(numericValue)
    ? getRiskColor(toRiskLevel(numericValue))
    : lineColor;
  const marker = `<span style="display:inline-block;margin-right:8px;border-radius:50%;width:10px;height:10px;background-color:${markerColor};"></span>`;
  const valueText = Number.isFinite(numericValue)
    ? numericValue.toFixed(FORECAST_DISPLAY_PRECISION)
    : String(rawValue ?? "");

  return `${formattedTime}<br/>${marker} ${tooltipRiskLabel}&nbsp;&nbsp;${valueText}`;
}

function createForecastXAxis(
  points: ForecastChartPoint[],
  labels: ForecastLabels,
  typography: ChartTypography,
) {
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const min = firstPoint?.minuteOffset ?? 0;
  const max =
    lastPoint && lastPoint.minuteOffset > min
      ? lastPoint.minuteOffset
      : min + typography.xAxisIntervalMinutes;
  const labelAnchor = min;

  return {
    type: "value" as const,
    min,
    max,
    interval: typography.xAxisIntervalMinutes,
    name: labels.xAxisName,
    nameLocation: "middle" as const,
    nameGap: FORECAST_LAYOUT.xAxisNameGap,
    nameTextStyle: {
      color: "#4b5563",
      fontSize: typography.axis,
      fontWeight: 400,
    },
    splitLine: {
      show: false,
    },
    axisLabel: {
      fontSize: typography.axis,
      hideOverlap: true,
      rotate: 90,
      formatter(value: string | number) {
        const numericValue = typeof value === "number" ? value : Number(value);

        if (
          !Number.isFinite(numericValue) ||
          !isForecastAxisTickAligned(
            numericValue,
            labelAnchor,
            typography.xAxisIntervalMinutes,
          )
        ) {
          return "";
        }

        return formatForecastMinutesLabel(numericValue);
      },
    },
  };
}

function createForecastYAxis(
  labels: ForecastLabels,
  typography: ChartTypography,
) {
  return [
    {
      type: "value" as const,
      min: 0,
      max: MAX_RISK_SCORE,
      interval: 1,
      axisPointer: {
        show: false,
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: "#6b7280",
          width: 1,
        },
      },
      axisTick: {
        show: true,
        length: 4,
        lineStyle: {
          color: "#6b7280",
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "#d1d5db",
          width: 1,
        },
      },
      axisLabel: {
        show: false,
      },
    },
    {
      type: "category" as const,
      position: "left" as const,
      axisPointer: {
        show: false,
      },
      name: labels.yAxisRiskName,
      nameLocation: "middle" as const,
      nameGap: FORECAST_LAYOUT.yAxisNameGap,
      nameTextStyle: {
        color: "#4b5563",
        fontSize: typography.riskBandAxis,
        fontWeight: 400,
      },
      data: [
        labels.riskLevelLong.low,
        labels.riskLevelLong.moderate,
        labels.riskLevelLong.high,
        labels.riskLevelLong.extreme,
      ],
      boundaryGap: true,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
      axisLabel: {
        rotate: 90,
        fontSize: typography.riskBandAxis,
        interval: 0,
        align: "center" as const,
        verticalAlign: "middle" as const,
        margin: FORECAST_LAYOUT.axisLabelMargin,
      },
    },
  ];
}

function createForecastSeries(
  chartPoints: ForecastChartPoint[],
  forecastPoints: ForecastChartPoint[],
  labels: ForecastLabels,
): EChartsOption["series"] {
  const lineColor = FORECAST_LINE_COLOR;

  return [
    ...toRiskBandSeries(chartPoints),
    {
      id: FORECAST_VISUAL_SERIES_ID,
      name: `${labels.tooltipRiskLabel}-visual`,
      type: "line",
      yAxisIndex: 0,
      z: 10,
      silent: true,
      smooth: false,
      symbol: "circle",
      showSymbol: false,
      symbolSize: 0,
      emphasis: { disabled: true },
      tooltip: { show: false },
      lineStyle: { width: 3, color: lineColor },
      itemStyle: { color: lineColor },
      data: chartPoints.map(toForecastPointDatum),
    },
    {
      id: FORECAST_POINT_SERIES_ID,
      name: `${labels.tooltipRiskLabel}-points`,
      type: "scatter",
      yAxisIndex: 0,
      z: 11,
      silent: true,
      animation: false,
      symbol: "circle",
      symbolSize: FORECAST_POINT_SYMBOL_SIZE,
      emphasis: { disabled: true },
      tooltip: { show: false },
      itemStyle: { color: lineColor },
      data: forecastPoints.map(toForecastPointDatum),
    },
    {
      id: FORECAST_TOOLTIP_SERIES_ID,
      name: labels.tooltipRiskLabel,
      type: "line",
      yAxisIndex: 0,
      z: 12,
      smooth: false,
      symbol: "none",
      showSymbol: false,
      emphasis: { disabled: true },
      lineStyle: {
        width: 1,
        opacity: 0,
      },
      itemStyle: {
        color: lineColor,
        opacity: 0,
      },
      data: forecastPoints.map(toForecastPointDatum),
    },
    {
      id: FORECAST_HIGHLIGHT_SERIES_ID,
      name: `${labels.tooltipRiskLabel}-highlight`,
      type: "scatter",
      yAxisIndex: 0,
      z: 13,
      silent: true,
      animation: false,
      symbol: "circle",
      symbolSize: 8,
      emphasis: { disabled: true },
      tooltip: { show: false },
      itemStyle: {
        color: "#ffffff",
        borderColor: lineColor,
        borderWidth: 2,
      },
      data: [],
    },
  ];
}

/**
 * Builds ECharts option for the 24-hour forecast risk chart.
 */
export function buildForecastOption(
  points: ForecastPoint[],
  labels: ForecastLabels,
  title?: string,
  isMobile = false,
): EChartsOption {
  const typography = getTypography(isMobile);
  const forecastPoints = toForecastCoordinatePoints(points);
  const chartPoints = toForecastChartPoints(forecastPoints);

  return {
    animation: false,
    title: title
      ? {
          text: title,
          left: "center",
          textStyle: { fontSize: typography.forecastTitle, fontWeight: 600 },
        }
      : undefined,
    grid: {
      left: FORECAST_LAYOUT.gridLeft,
      right: FORECAST_LAYOUT.gridRight,
      top: title ? 2 : 2,
      bottom: FORECAST_LAYOUT.gridBottom,
      containLabel: true,
    },
    xAxis: createForecastXAxis(chartPoints, labels, typography),
    yAxis: createForecastYAxis(labels, typography),
    series: createForecastSeries(chartPoints, forecastPoints, labels),
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "line",
        snap: true,
        lineStyle: {
          color: "#9ca3af",
          width: 1,
          type: "dashed",
        },
        label: {
          show: false,
        },
      },
      formatter: (params: TooltipComponentFormatterCallbackParams) =>
        formatForecastTooltip(params, labels.tooltipRiskLabel, forecastPoints),
    },
  };
}
