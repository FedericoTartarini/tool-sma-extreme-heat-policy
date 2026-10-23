import { rem } from "@mantine/core";

export const UI_INLINE_ICON_SIZE = 16;
export const UI_INLINE_ICON_STROKE = 2;

export const UI_TITLE_ICON_SIZE = 20;
export const UI_TITLE_ICON_STROKE = 1.8;
export const UI_TITLE_THEME_ICON_SIZE = "xl";

export const COMPACT_RECOMMENDATION_LAYOUT_QUERY = "(max-width: 36em)";
export const ACTION_IMAGE_ICON_SIZE = "calc(var(--mantine-font-size-md) * 2.5)";

export const DASHBOARD_CARD_HIT_LAYER_Z_INDEX = 1;
export const DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX = 2;

export const RISK_STACKED_BAR_HEIGHT = rem(14);
export const RISK_STACKED_BAR_CHART_PADDING_TOP = rem(32);
export const RISK_STACKED_BAR_CHART_PADDING_BOTTOM = rem(6);
export const RISK_STACKED_BAR_VALUE_TOP = rem(4);
export const RISK_STACKED_BAR_LEGEND_GAP = 0;
export const RISK_STACKED_BAR_PADDING_BELOW_LEGEND = rem(12);
export const RISK_STACKED_BAR_MARKER_WIDTH = rem(2);
export const RISK_STACKED_BAR_MARKER_TRIANGLE = rem(6);
export const RISK_STACKED_BAR_MARKER_TOP = rem(-7);
export const RISK_STACKED_BAR_MARKER_BOTTOM = rem(-3);
/** Horizontal inset so the bar track aligns with card content on both sides. */
export const RISK_STACKED_BAR_TRACK_INSET = rem(6);

export function getRiskStackedBarTrackInsetStyle(): {
  paddingInline: string;
} {
  return {
    paddingInline: RISK_STACKED_BAR_TRACK_INSET,
  };
}

export function getRiskStackedBarAnchorStyle(markerPercent: number): {
  left: string;
  transform: string;
} {
  const inset = RISK_STACKED_BAR_TRACK_INSET;
  const insetTotal = `calc(2 * ${inset})`;

  if (markerPercent <= 0) {
    return { left: inset, transform: "none" };
  }

  if (markerPercent >= 100) {
    return {
      left: `calc(100% - ${inset})`,
      transform: "translateX(-100%)",
    };
  }

  return {
    left: `calc(${inset} + (100% - ${insetTotal}) * ${markerPercent / 100})`,
    transform: "translateX(-50%)",
  };
}
