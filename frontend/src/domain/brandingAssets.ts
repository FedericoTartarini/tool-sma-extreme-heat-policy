import {
  BRANDING_IMAGE_CONFIG,
  type FixedHeightResponsiveImageConfig,
} from "@/config/responsiveImages";
import {
  createResponsiveImageAsset,
  type ResponsiveImageAsset,
} from "@/lib/responsiveImage";

export interface BrandingImageAsset extends ResponsiveImageAsset {
  readonly renderedHeight: string;
}

function createBrandingImageAsset(
  assetPath: string,
  config: FixedHeightResponsiveImageConfig,
): BrandingImageAsset | null {
  const image = createResponsiveImageAsset({
    assetPath,
    config,
  });

  return image === null
    ? null
    : { ...image, renderedHeight: config.renderedHeight };
}

export const BRANDING_ASSETS = {
  headerUsyd: createBrandingImageAsset(
    "branding/logo-usyd-black",
    BRANDING_IMAGE_CONFIG.headerUsyd,
  ),
  footerUsyd: createBrandingImageAsset(
    "branding/logo-usyd-black",
    BRANDING_IMAGE_CONFIG.footerUsyd,
  ),
  footerSma: createBrandingImageAsset(
    "branding/sma-black",
    BRANDING_IMAGE_CONFIG.footerSma,
  ),
} satisfies Record<string, BrandingImageAsset | null>;
