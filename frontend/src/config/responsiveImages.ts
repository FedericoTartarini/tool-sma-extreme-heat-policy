import type { ResponsiveImageConfig } from "@/lib/responsiveImage";

export interface ResponsiveSquareImageConfig extends ResponsiveImageConfig {
  readonly renderedSize: string;
}

export interface FixedHeightResponsiveImageConfig extends ResponsiveImageConfig {
  readonly renderedHeight: string;
}

interface FixedHeightResponsiveImageConfigOptions {
  readonly widths: readonly number[];
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly renderedHeightPx: number;
}

const ROOT_FONT_SIZE_PX = 16;

function toRem(px: number): string {
  return `${Number((px / ROOT_FONT_SIZE_PX).toFixed(4))}rem`;
}

function createFixedHeightResponsiveImageConfig({
  widths,
  sourceWidth,
  sourceHeight,
  renderedHeightPx,
}: FixedHeightResponsiveImageConfigOptions): FixedHeightResponsiveImageConfig {
  return {
    widths,
    sizes: toRem((renderedHeightPx * sourceWidth) / sourceHeight),
    renderedHeight: toRem(renderedHeightPx),
  };
}

const RECOMMENDATION_ACTION_RENDERED_SIZE = "2.5rem";

export const RECOMMENDATION_ACTION_IMAGE_CONFIG = {
  widths: [48, 96, 192],
  sizes: RECOMMENDATION_ACTION_RENDERED_SIZE,
  renderedSize: RECOMMENDATION_ACTION_RENDERED_SIZE,
} satisfies ResponsiveSquareImageConfig;

// The app treats Mantine's size="sm" Container as a 720px border box.
// SiteShell and SectionCard each add 0.75rem per side, leaving the container
// width minus 3rem for the image at every viewport size.
const HOME_CONTAINER_MAX_WIDTH_PX = 720;
const HOME_IMAGE_INLINE_PADDING_REM = 3;
const SPORT_IMAGE_SIZES = `(max-width: ${HOME_CONTAINER_MAX_WIDTH_PX}px) calc(100vw - ${HOME_IMAGE_INLINE_PADDING_REM}rem), calc(${HOME_CONTAINER_MAX_WIDTH_PX}px - ${HOME_IMAGE_INLINE_PADDING_REM}rem)`;

export const DEFAULT_SPORT_IMAGE_CONFIG = {
  widths: [320, 640, 816],
  sizes: SPORT_IMAGE_SIZES,
} satisfies ResponsiveImageConfig;

export const SPORT_IMAGE_CONFIG_BY_ASSET_NAME = {
  // These source files are 522px wide, so their ladders stop at the native
  // width instead of inventing upscaled 640px and 816px candidates.
  soccer: {
    widths: [320, 522],
    sizes: SPORT_IMAGE_SIZES,
  },
  walking: {
    widths: [320, 522],
    sizes: SPORT_IMAGE_SIZES,
  },
} as const satisfies Record<string, ResponsiveImageConfig>;

export function getSportImageConfig(assetName: string): ResponsiveImageConfig {
  if (!Object.hasOwn(SPORT_IMAGE_CONFIG_BY_ASSET_NAME, assetName)) {
    return DEFAULT_SPORT_IMAGE_CONFIG;
  }

  const configuredAssetName =
    assetName as keyof typeof SPORT_IMAGE_CONFIG_BY_ASSET_NAME;

  return SPORT_IMAGE_CONFIG_BY_ASSET_NAME[configuredAssetName];
}

// Intrinsic dimensions come from the original 471x163 USYD and 1314x527 SMA
// logo files. Source sizes are rendered height multiplied by the source ratio.
export const BRANDING_IMAGE_CONFIG = {
  headerUsyd: createFixedHeightResponsiveImageConfig({
    widths: [160, 320],
    sourceWidth: 471,
    sourceHeight: 163,
    renderedHeightPx: 35,
  }),
  footerUsyd: createFixedHeightResponsiveImageConfig({
    widths: [160, 320, 471],
    sourceWidth: 471,
    sourceHeight: 163,
    renderedHeightPx: 50,
  }),
  footerSma: createFixedHeightResponsiveImageConfig({
    widths: [160, 320, 480],
    sourceWidth: 1314,
    sourceHeight: 527,
    renderedHeightPx: 50,
  }),
} as const satisfies Record<string, FixedHeightResponsiveImageConfig>;
