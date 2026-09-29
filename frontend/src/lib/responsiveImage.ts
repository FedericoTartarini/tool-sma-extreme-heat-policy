import { toPublicAssetUrl } from "@/lib/publicAssetUrl";

export interface ResponsiveImageAsset {
  readonly src: string;
  readonly srcSet: string;
  readonly sizes: string;
}

export interface ResponsiveImageConfig {
  /** Available intrinsic image widths. */
  readonly widths: readonly number[];
  /** Browser source-size expression matching the rendered image size. */
  readonly sizes: string;
}

export interface CreateResponsiveImageAssetOptions {
  /** Public asset path without a file extension or width suffix. */
  assetPath: string;
  config: ResponsiveImageConfig;
}

/** Creates responsive image URLs for width-suffixed WebP assets. */
export function createResponsiveImageAsset({
  assetPath,
  config: { widths, sizes },
}: CreateResponsiveImageAssetOptions): ResponsiveImageAsset | null {
  const normalizedAssetPath = assetPath.trim();

  if (normalizedAssetPath === "") {
    return null;
  }

  if (/\.[^/]*$/.test(normalizedAssetPath)) {
    return null;
  }

  const normalizedWidths = [
    ...new Set(widths.filter((width) => Number.isInteger(width) && width > 0)),
  ].sort((firstWidth, secondWidth) => firstWidth - secondWidth);

  if (normalizedWidths.length === 0) {
    return null;
  }

  const toCandidateUrl = (width: number) =>
    toPublicAssetUrl(`${normalizedAssetPath}-${width}.webp`);
  const fallbackWidth = normalizedWidths[normalizedWidths.length - 1];

  return {
    src: toCandidateUrl(fallbackWidth),
    srcSet: normalizedWidths
      .map((width) => `${toCandidateUrl(width)} ${width}w`)
      .join(", "),
    sizes,
  };
}
