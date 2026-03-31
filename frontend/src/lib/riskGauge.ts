import type { EChartsOption } from "echarts";
import type { RiskLevel } from "@/domain/risk";
import { toRiskLevel } from "@/domain/risk";
import { getReadableTextColor } from "@/lib/colorContrast";
import {
  getRiskBands,
  getRiskColor,
  MAX_RISK_SCORE,
} from "@/domain/riskRegistry";

export const RISK_GAUGE_MIN_SCORE = 0;
export const RISK_GAUGE_MAX_SCORE = MAX_RISK_SCORE;
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
type RiskGaugeGraphic = {
  elements: Array<Record<string, unknown>>;
};

const RISK_GAUGE_LAYOUTS: {
  min: RiskGaugeLayout;
  max: RiskGaugeLayout;
} = {
  min: {
    arcWidth: 56,
    bottomInset: 4,
    labelDistance: 28,
    labelFontSize: 12,
    pointerBorderWidth: 1.5,
    pointerWidth: 5,
    sideInset: 10,
    topInset: 8,
    unavailableFontSize: 20,
    valueBottomOffset: 4,
    valueFontSize: 32,
  },
  max: {
    arcWidth: 108,
    bottomInset: 8,
    labelDistance: 54,
    labelFontSize: 16,
    pointerBorderWidth: 2,
    pointerWidth: 7,
    sideInset: 10,
    topInset: 12,
    unavailableFontSize: 24,
    valueBottomOffset: 6,
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

export function getRiskGaugeGeometry(
  isMobile = false,
  containerWidth?: number,
): RiskGaugeGeometry {
  const width = getRiskGaugeWidth(isMobile, containerWidth);
  const layout = getRiskGaugeLayout(isMobile, width);
  const radius = Math.max(width / 2 - layout.sideInset, layout.arcWidth);
  const centerY = layout.topInset + radius;

  return {
    bottomInset: layout.bottomInset,
    centerY,
    height: Math.ceil(centerY + layout.bottomInset),
    radius,
    sideInset: layout.sideInset,
    topInset: layout.topInset,
    valueBottomOffset: layout.valueBottomOffset,
    width,
  };
}

function buildRiskGaugeGraphic(
  score: number,
  activeLevel: RiskLevel | null,
  layout: RiskGaugeLayout,
  geometry: RiskGaugeGeometry,
) {
  const { width, centerY, radius } = geometry;
  const centerX = width / 2;
  const innerRadius = Math.max(radius - layout.arcWidth, 0);
  const elements: RiskGaugeGraphic = { elements: [] };

  const pointerAngle = getRiskGaugePointerAngle(score);

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

/**
 * Clamps a score into the supported gauge range or returns null when unavailable.
 */
export function normalizeRiskGaugeScore(score: number): number | null {
  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.min(Math.max(score, RISK_GAUGE_MIN_SCORE), RISK_GAUGE_MAX_SCORE);
}

/**
 * Returns the active risk level for a clamped gauge score.
 */
export function getRiskGaugeActiveLevel(score: number): RiskLevel | null {
  const normalizedScore = normalizeRiskGaugeScore(score);

  return normalizedScore === null ? null : toRiskLevel(normalizedScore);
}

/**
 * Maps the gauge score onto the semicircle needle angle.
 */
export function getRiskGaugePointerAngle(score: number): number | null {
  const normalizedScore = normalizeRiskGaugeScore(score);

  if (normalizedScore === null) {
    return null;
  }

  return (
    RISK_GAUGE_TOTAL_ANGLE -
    (normalizedScore / RISK_GAUGE_MAX_SCORE) * RISK_GAUGE_TOTAL_ANGLE
  );
}

/**
 * Returns the start/end/midpoint angles for a band index across the half gauge.
 */
export function getRiskGaugeSegmentAngles(index: number): {
  startAngle: number;
  endAngle: number;
  midpointAngle: number;
} {
  const segmentSpan = RISK_GAUGE_TOTAL_ANGLE / RISK_GAUGE_SEGMENT_COUNT;
  const startAngle = RISK_GAUGE_TOTAL_ANGLE - index * segmentSpan;
  const endAngle = startAngle - segmentSpan;

  return {
    startAngle,
    endAngle,
    midpointAngle: startAngle - segmentSpan / 2,
  };
}

/**
 * Formats the center gauge value with a fallback label when unavailable.
 */
export function formatRiskGaugeValue(
  score: number,
  unavailableLabel: string,
): string {
  const normalizedScore = normalizeRiskGaugeScore(score);

  return normalizedScore === null
    ? unavailableLabel
    : normalizedScore.toFixed(1);
}

export function getRiskGaugeValueLayout(
  score: number,
  isMobile = false,
  containerWidth?: number,
): {
  bottomOffset: number;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
} {
  const normalizedScore = normalizeRiskGaugeScore(score);
  const layout = getRiskGaugeLayout(isMobile, containerWidth);
  const geometry = getRiskGaugeGeometry(isMobile, containerWidth);
  const fontSize =
    normalizedScore === null
      ? layout.unavailableFontSize
      : layout.valueFontSize;

  return {
    bottomOffset: geometry.valueBottomOffset,
    fontSize,
    fontWeight: 800,
    lineHeight: 0.82,
  };
}

/**
 * Builds the current-risk gauge option in an ECharts layout close to the legacy design.
 */
export function buildRiskGaugeOption(
  score: number,
  labels: RiskGaugeLabels,
  _centerLabel: string,
  _unavailableLabel: string,
  isMobile = false,
  containerWidth?: number,
): EChartsOption {
  const normalizedScore = normalizeRiskGaugeScore(score);
  const activeLevel = getRiskGaugeActiveLevel(score);
  const layout = getRiskGaugeLayout(isMobile, containerWidth);
  const geometry = getRiskGaugeGeometry(isMobile, containerWidth);
  const center = [geometry.width / 2, geometry.centerY];

  return {
    animation: false,
    tooltip: {
      show: false,
    },
    graphic: buildRiskGaugeGraphic(score, activeLevel, layout, geometry),
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
        data: [{ value: normalizedScore ?? RISK_GAUGE_MIN_SCORE }],
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
            value: normalizedScore ?? RISK_GAUGE_MIN_SCORE,
          },
        ],
      },
    ],
  };
}
