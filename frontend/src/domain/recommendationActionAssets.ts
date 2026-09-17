import {
  createResponsiveImageAsset,
  type ResponsiveImageAsset,
} from "@/lib/responsiveImage";

const ACTION_IMAGE_WIDTHS = [48, 96] as const;

export const RECOMMENDATION_ACTION_ASSETS = {
  hydration: createResponsiveImageAsset({
    assetPath: "actions/hydration",
    widths: ACTION_IMAGE_WIDTHS,
  }),
  clothing: createResponsiveImageAsset({
    assetPath: "actions/clothing",
    widths: ACTION_IMAGE_WIDTHS,
  }),
  pause: createResponsiveImageAsset({
    assetPath: "actions/pause",
    widths: ACTION_IMAGE_WIDTHS,
  }),
  cooling: createResponsiveImageAsset({
    assetPath: "actions/cooling",
    widths: ACTION_IMAGE_WIDTHS,
  }),
  stop: createResponsiveImageAsset({
    assetPath: "actions/stop",
    widths: ACTION_IMAGE_WIDTHS,
  }),
} satisfies Record<string, ResponsiveImageAsset>;

export type RecommendationActionAssetKey =
  keyof typeof RECOMMENDATION_ACTION_ASSETS;
