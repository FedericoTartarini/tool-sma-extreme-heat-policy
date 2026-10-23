import { RECOMMENDATION_ACTION_IMAGE_CONFIG } from "@/config/responsiveImages";
import {
  createResponsiveImageAsset,
  type ResponsiveImageAsset,
} from "@/lib/responsiveImage";

function createActionImageAsset(name: string): ResponsiveImageAsset | null {
  return createResponsiveImageAsset({
    assetPath: `actions/${name}`,
    config: RECOMMENDATION_ACTION_IMAGE_CONFIG,
  });
}

export const RECOMMENDATION_ACTION_ASSETS = {
  hydration: createActionImageAsset("hydration"),
  clothing: createActionImageAsset("clothing"),
  pause: createActionImageAsset("pause"),
  cooling: createActionImageAsset("cooling"),
  stop: createActionImageAsset("stop"),
} satisfies Record<string, ResponsiveImageAsset | null>;

export type RecommendationActionAssetKey =
  keyof typeof RECOMMENDATION_ACTION_ASSETS;
