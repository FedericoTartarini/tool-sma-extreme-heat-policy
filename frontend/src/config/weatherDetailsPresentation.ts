import { CONTENT_GAP } from "@/config/uiLayout";

export const WEATHER_DETAILS_GRID_SPACING = CONTENT_GAP;
export const WEATHER_DETAILS_METRIC_INNER_GAP = "xs";

export const WEATHER_DETAILS_TITLE = {
  fw: 600,
  fz: "sm",
  lh: 1,
} as const;

export const WEATHER_DETAILS_METRIC_LABEL = {
  c: "dimmed",
  fz: "sm",
  lh: 1,
} as const;

export const WEATHER_DETAILS_METRIC_VALUE = {
  fw: 600,
  fz: { base: "sm", sm: "md" },
  lh: 1,
} as const;
