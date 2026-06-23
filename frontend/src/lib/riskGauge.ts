import type { EChartsOption } from "echarts";
import type { RiskLevel } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import { getReadableTextColor } from "@/lib/colorContrast";
import {
  getRiskBands,
  getRiskColor,
  RISK_DISPLAY_AXIS_MAX,
  toRiskDisplayScore,
} from "@/domain/riskRegistry";

export const RISK_GAUGE_MIN_SCORE = 0;
export const RISK_GAUGE_MAX_SCORE = RISK_DISPLAY_AXIS_MAX;
export const RISK_GAUGE_MIN_WIDTH = 200;
export const RISK_GAUGE_MAX_WIDTH = 400;
const RISK_GAUGE_TOTAL_ANGLE = 180;
const RISK_GAUGE_SEGMENT_COUNT = 4;
const RISK_GAUGE_START_ANGLE = 180;
const RISK_GAUGE_END_ANGLE = 0;
const RISK_GAUGE_SPLIT_NUMBER = 8;
const GAUGE_POINTER_OUTLINE = "#172033";
const GAUGE_TRANSPARENT = "rgba(0, 0, 0, 0)";

type RiskGaugeLayout = {
  arcWidth: number;
  bottomInset: number;
  labelDistance: number;
  labelFontSize: number;
  pointerBorderWidth: number;
  pointerWidth: number;
  sideInset: number;
  topInset: number;
  unavailableFontSize: number;
  valueBottomOffset: number;
  valueFontSize: number;
};

export type RiskGaugeLabels = Record<RiskLevel, string>;
export type RiskGaugeGeometry = {
  bottomInset: number;
  centerY: number;
  height: number;
  radius: number;
  sideInset: number;
  topInset: number;
  valueBottomOffset: number;
  width: number;
};
export type RiskGaugeValueLayout = {
  bottomOffset: number;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
};
export type RiskGaugeRenderModel = {
  displayValue: string;
  geometry: RiskGaugeGeometry;
  option: EChartsOption;
  valueLayout: RiskGaugeValueLayout;
};
type RiskGaugeGraphic = {
  elements: Array<Record<string, unknown>>;
};
type RiskGaugeMeasurements = {
  activeLevel: RiskLevel | null;
  displayScore: number | null;
  geometry: RiskGaugeGeometry;
  layout: RiskGaugeLayout;
  pointerAngle: number | null;
  valueLayout: RiskGaugeValueLayout;
};
type RiskGaugeSizing = {
  geometry: RiskGaugeGeometry;
  layout: RiskGaugeLayout;
};

const RISK_GAUGE_LAYOUTS: {
  min: RiskGaugeLayout;
  max: RiskGaugeLayout;
} = {
  min: {
    arcWidth: 56,
    bottomInset: 6,
    labelDistance: 28,
    labelFontSize: 12,
    pointerBorderWidth: 1.5,
    pointerWidth: 5,
    sideInset: 10,
    topInset: 4,
    unavailableFontSize: 20,
    valueBottomOffset: 4,
    valueFontSize: 32,
  },
  max: {
    arcWidth: 108,
    bottomInset: 6,
    labelDistance: 54,
    labelFontSize: 16,
    pointerBorderWidth: 2,
    pointerWidth: 7,
    sideInset: 10,
    topInset: 4,
    unavailableFontSize: 24,
    valueBottomOffset: 4,
    valueFontSize: 48,
  },
};

function clampRiskGaugeWidth(width: number): number {
  return Math.min(Math.max(width, RISK_GAUGE_MIN_WIDTH), RISK_GAUGE_MAX_WIDTH);
}

export function getRiskGaugeWidth(
  isMobile = false,
  containerWidth?: number,
): number {
  if (!containerWidth || !Number.isFinite(containerWidth)) {
    return isMobile ? RISK_GAUGE_MIN_WIDTH : RISK_GAUGE_MAX_WIDTH;
  }

  return clampRiskGaugeWidth(containerWidth);
}

function interpolateNumber(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

function getRiskGaugeLayout(
  isMobile: boolean,
  containerWidth?: number,
): RiskGaugeLayout {
  const clampedWidth = getRiskGaugeWidth(isMobile, containerWidth);
  const t =
    (clampedWidth - RISK_GAUGE_MIN_WIDTH) /
    (RISK_GAUGE_MAX_WIDTH - RISK_GAUGE_MIN_WIDTH);

  return {
    arcWidth: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.arcWidth,
        RISK_GAUGE_LAYOUTS.max.arcWidth,
        t,
      ),
    ),
    bottomInset: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.bottomInset,
        RISK_GAUGE_LAYOUTS.max.bottomInset,
        t,
      ),
    ),
    labelDistance: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.labelDistance,
        RISK_GAUGE_LAYOUTS.max.labelDistance,
        t,
      ),
    ),
    labelFontSize: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.labelFontSize,
        RISK_GAUGE_LAYOUTS.max.labelFontSize,
        t,
      ),
    ),
    pointerBorderWidth: interpolateNumber(
      RISK_GAUGE_LAYOUTS.min.pointerBorderWidth,
      RISK_GAUGE_LAYOUTS.max.pointerBorderWidth,
      t,
    ),
    pointerWidth: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.pointerWidth,
        RISK_GAUGE_LAYOUTS.max.pointerWidth,
        t,
      ),
    ),
    sideInset: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.sideInset,
        RISK_GAUGE_LAYOUTS.max.sideInset,
        t,
      ),
    ),
    topInset: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.topInset,
        RISK_GAUGE_LAYOUTS.max.topInset,
        t,
      ),
    ),
    unavailableFontSize: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.unavailableFontSize,
        RISK_GAUGE_LAYOUTS.max.unavailableFontSize,
        t,
      ),
    ),
    valueBottomOffset: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.valueBottomOffset,
        RISK_GAUGE_LAYOUTS.max.valueBottomOffset,
        t,
      ),
    ),
    valueFontSize: Math.round(
      interpolateNumber(
        RISK_GAUGE_LAYOUTS.min.valueFontSize,
        RISK_GAUGE_LAYOUTS.max.valueFontSize,
        t,
      ),
    ),
  };
}

function toRiskGaugeColorStops(): [number, string][] {
  return getRiskBands().map((band) => [
    band.upper / RISK_GAUGE_MAX_SCORE,
    band.color,
  ]);
}

function getRiskGaugeLabelToken(
  value: number,
  labels: RiskGaugeLabels,
): { level: RiskLevel; text: string } | null {
  const midpointIndex = Math.round(value - 0.5);
  const expectedMidpoint = midpointIndex + 0.5;

  if (
    midpointIndex < 0 ||
    midpointIndex >= RISK_GAUGE_SEGMENT_COUNT ||
    Math.abs(value - expectedMidpoint) > 0.001
  ) {
    return null;
  }

  const band = getRiskBands()[midpointIndex];

  if (!band) {
    return null;
  }

  return {
    level: band.level,
    text: labels[band.level],
  };
}

function getRiskGaugeRichLabelStyles(layout: RiskGaugeLayout): Record<
  RiskLevel,
  {
    color: string;
    fontSize: number;
    fontWeight: number;
  }
> {
  return getRiskBands().reduce(
    (styles, band) => {
      styles[band.level] = {
        color: getReadableTextColor(band.color),
        fontSize: layout.labelFontSize,
        fontWeight: 800,
      };

      return styles;
    },
    {} as Record<
      RiskLevel,
      {
        color: string;
        fontSize: number;
        fontWeight: number;
      }
    >,
  );
}

function getRiskGaugeSizing(
  isMobile = false,
  containerWidth?: number,
): RiskGaugeSizing {
  const width = getRiskGaugeWidth(isMobile, containerWidth);
  const layout = getRiskGaugeLayout(isMobile, width);
  const radius = Math.max(width / 2 - layout.sideInset, layout.arcWidth);
  const centerY = layout.topInset + radius;
  const geometry: RiskGaugeGeometry = {
    bottomInset: layout.bottomInset,
    centerY,
    height: Math.ceil(centerY + layout.bottomInset),
    radius,
    sideInset: layout.sideInset,
    topInset: layout.topInset,
    valueBottomOffset: layout.valueBottomOffset,
    width,
  };

  return {
    geometry,
    layout,
  };
}

function getRiskGaugeMeasurements(
  score: number,
  isMobile = false,
  containerWidth?: number,
): RiskGaugeMeasurements {
  const { geometry, layout } = getRiskGaugeSizing(isMobile, containerWidth);
  const displayScore = normalizeRiskGaugeScore(score);
  const valueLayout: RiskGaugeValueLayout = {
    bottomOffset: geometry.valueBottomOffset,
    fontSize:
      displayScore === null ? layout.unavailableFontSize : layout.valueFontSize,
    fontWeight: 800,
    lineHeight: 0.82,
  };
  const pointerAngle =
    displayScore === null
      ? null
      : RISK_GAUGE_TOTAL_ANGLE -
        (displayScore / RISK_GAUGE_MAX_SCORE) * RISK_GAUGE_TOTAL_ANGLE;

  return {
    activeLevel: displayScore === null ? null : toRiskLevel(score),
    displayScore,
    geometry,
    layout,
    pointerAngle,
    valueLayout,
  };
}

export function getRiskGaugeGeometry(
  isMobile = false,
  containerWidth?: number,
): RiskGaugeGeometry {
  return getRiskGaugeSizing(isMobile, containerWidth).geometry;
}

function buildRiskGaugeGraphic(
  pointerAngle: number | null,
  activeLevel: RiskLevel | null,
  layout: RiskGaugeLayout,
  geometry: RiskGaugeGeometry,
) {
  const { width, centerY, radius } = geometry;
  const centerX = width / 2;
  const innerRadius = Math.max(radius - layout.arcWidth, 0);
  const elements: RiskGaugeGraphic = { elements: [] };

  if (pointerAngle === null || !activeLevel) {
    return elements;
  }

  const radians = (pointerAngle * Math.PI) / 180;
  const tipRadius = innerRadius + layout.arcWidth * 0.34;
  const tailRadius = innerRadius - layout.arcWidth * 0.26;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const tipX = centerX + cos * tipRadius;
  const tipY = centerY - sin * tipRadius;
  const tailX = centerX + cos * tailRadius;
  const tailY = centerY - sin * tailRadius;
  const uy = -sin;
  const px = -uy;
  const py = cos;
  const baseHalfWidth = Math.max(layout.pointerWidth * 0.58, 1.9);
  const polygonPoints = [
    [tipX, tipY],
    [tailX + px * baseHalfWidth, tailY + py * baseHalfWidth],
    [tailX - px * baseHalfWidth, tailY - py * baseHalfWidth],
  ];

  elements.elements.unshift({
    type: "polygon",
    silent: true,
    z: 8,
    shape: {
      points: polygonPoints,
    },
    style: {
      fill: getRiskColor(activeLevel),
      stroke: GAUGE_POINTER_OUTLINE,
      lineWidth: Math.max(layout.pointerBorderWidth * 0.6, 1),
    },
  });

  return elements;
}

function buildRiskGaugeOptionFromMeasurements(
  labels: RiskGaugeLabels,
  measurements: RiskGaugeMeasurements,
): EChartsOption {
  const { activeLevel, displayScore, geometry, layout, pointerAngle } =
    measurements;
  const center = [geometry.width / 2, geometry.centerY];

  return {
    animation: false,
    tooltip: {
      show: false,
    },
    graphic: buildRiskGaugeGraphic(pointerAngle, activeLevel, layout, geometry),
    series: [
      {
        type: "gauge",
        silent: true,
        startAngle: RISK_GAUGE_START_ANGLE,
        endAngle: RISK_GAUGE_END_ANGLE,
        center,
        radius: geometry.radius,
        min: RISK_GAUGE_MIN_SCORE,
        max: RISK_GAUGE_MAX_SCORE,
        splitNumber: RISK_GAUGE_SEGMENT_COUNT,
        clockwise: true,
        axisLine: {
          lineStyle: {
            width: layout.arcWidth,
            color: toRiskGaugeColorStops(),
          },
        },
        progress: {
          show: false,
        },
        pointer: {
          show: false,
        },
        anchor: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        title: {
          show: false,
        },
        detail: {
          show: false,
        },
        data: [{ value: displayScore ?? RISK_GAUGE_MIN_SCORE }],
      },
      {
        type: "gauge",
        silent: true,
        startAngle: RISK_GAUGE_START_ANGLE,
        endAngle: RISK_GAUGE_END_ANGLE,
        center,
        radius: geometry.radius,
        min: RISK_GAUGE_MIN_SCORE,
        max: RISK_GAUGE_MAX_SCORE,
        splitNumber: RISK_GAUGE_SPLIT_NUMBER,
        clockwise: true,
        axisLine: {
          lineStyle: {
            width: 0,
            color: [[1, GAUGE_TRANSPARENT]],
          },
        },
        progress: {
          show: false,
        },
        pointer: {
          show: false,
        },
        anchor: {
          show: false,
        },
        axisTick: {
          show: false,
          splitNumber: 1,
          length: 0,
          distance: 0,
        },
        splitLine: {
          show: false,
          length: 0,
          distance: 0,
        },
        axisLabel: {
          show: true,
          distance: layout.labelDistance,
          rotate: "tangential",
          formatter(value: number) {
            const token = getRiskGaugeLabelToken(value, labels);

            return token ? `{${token.level}|${token.text}}` : "";
          },
          rich: getRiskGaugeRichLabelStyles(layout),
        },
        title: {
          show: false,
        },
        detail: {
          show: false,
        },
        data: [
          {
            value: displayScore ?? RISK_GAUGE_MIN_SCORE,
          },
        ],
      },
    ],
  };
}

/**
 * Maps a raw risk score into the gauge display range or returns null when unavailable.
 */
export function normalizeRiskGaugeScore(score: number): number | null {
  return toRiskDisplayScore(score);
}

/**
 * Returns the active risk level for the raw gauge score.
 */
export function getRiskGaugeActiveLevel(score: number): RiskLevel | null {
  const displayScore = normalizeRiskGaugeScore(score);

  return displayScore === null ? null : toRiskLevel(score);
}

/**
 * Maps the raw gauge score onto the semicircle needle angle.
 */
export function getRiskGaugePointerAngle(score: number): number | null {
  const displayScore = normalizeRiskGaugeScore(score);

  if (displayScore === null) {
    return null;
  }

  return (
    RISK_GAUGE_TOTAL_ANGLE -
    (displayScore / RISK_GAUGE_MAX_SCORE) * RISK_GAUGE_TOTAL_ANGLE
  );
}

/**
 * Formats the center gauge value with a fallback label when unavailable.
 */
export function formatRiskGaugeValue(
  score: number,
  unavailableLabel: string,
): string {
  return Number.isFinite(score) ? score.toFixed(1) : unavailableLabel;
}

export function getRiskGaugeValueLayout(
  score: number,
  isMobile = false,
  containerWidth?: number,
): RiskGaugeValueLayout {
  return getRiskGaugeMeasurements(score, isMobile, containerWidth).valueLayout;
}

/**
 * Builds the current-risk gauge option in an ECharts layout close to the legacy design.
 */
export function buildRiskGaugeOption(
  score: number,
  labels: RiskGaugeLabels,
  isMobile = false,
  containerWidth?: number,
): EChartsOption {
  return buildRiskGaugeOptionFromMeasurements(
    labels,
    getRiskGaugeMeasurements(score, isMobile, containerWidth),
  );
}

export function getRiskGaugeRenderModel(
  score: number,
  labels: RiskGaugeLabels,
  unavailableLabel: string,
  isMobile = false,
  containerWidth?: number,
): RiskGaugeRenderModel {
  const measurements = getRiskGaugeMeasurements(
    score,
    isMobile,
    containerWidth,
  );

  return {
    displayValue: formatRiskGaugeValue(score, unavailableLabel),
    geometry: measurements.geometry,
    option: buildRiskGaugeOptionFromMeasurements(labels, measurements),
    valueLayout: measurements.valueLayout,
  };
}
