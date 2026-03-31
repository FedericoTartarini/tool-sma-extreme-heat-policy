import { toPublicAssetUrl } from "@/lib/publicAssetUrl";

export const RECOMMENDATION_ACTION_ASSETS = {
  hydration: toPublicAssetUrl("actions/hydration.png"),
  clothing: toPublicAssetUrl("actions/clothing.png"),
  pause: toPublicAssetUrl("actions/pause.png"),
  cooling: toPublicAssetUrl("actions/cooling.png"),
  stop: toPublicAssetUrl("actions/stop.png"),
} satisfies Record<string, string>;

export type RecommendationActionAssetKey =
  keyof typeof RECOMMENDATION_ACTION_ASSETS;
