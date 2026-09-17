import {
  createResponsiveImageAsset,
  type ResponsiveImageAsset,
} from "@/lib/responsiveImage";

export const BRANDING_ASSETS = {
  usyd: createResponsiveImageAsset({
    assetPath: "branding/logo-usyd-black",
    widths: [160, 320],
  }),
  sma: createResponsiveImageAsset({
    assetPath: "branding/sma-black",
    widths: [160, 320],
  }),
} satisfies Record<"usyd" | "sma", ResponsiveImageAsset>;
