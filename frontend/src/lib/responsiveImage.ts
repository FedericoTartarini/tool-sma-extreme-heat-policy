import { toPublicAssetUrl } from "@/lib/publicAssetUrl";

export interface ResponsiveImageAsset {
  readonly src: string;
  readonly srcSet: string;
}

export interface CreateResponsiveImageAssetOptions {
  /** Public asset path without a file extension or width suffix. */
  assetPath: string;
  /** Available intrinsic image widths. */
  widths: readonly number[];
}

/** Creates responsive image URLs for width-suffixed WebP assets. */
export function createResponsiveImageAsset({
  assetPath,
  widths,
}: CreateResponsiveImageAssetOptions): ResponsiveImageAsset {
  const normalizedAssetPath = assetPath.trim().replace(/^\/+/, "");

  if (normalizedAssetPath === "") {
    throw new Error("Responsive image assetPath must not be empty.");
  }

  if (/\.[^/]*$/.test(normalizedAssetPath)) {
    throw new Error(
      "Responsive image assetPath must not include a file extension.",
    );
  }

  if (
    widths.length === 0 ||
    widths.some((width) => !Number.isInteger(width) || width <= 0)
  ) {
    throw new Error("Responsive image widths must contain positive integers.");
  }

  const normalizedWidths = [...new Set(widths)].sort(
    (firstWidth, secondWidth) => firstWidth - secondWidth,
  );
  const toCandidateUrl = (width: number) =>
    toPublicAssetUrl(`${normalizedAssetPath}-${width}.webp`);
  const fallbackWidth = normalizedWidths[normalizedWidths.length - 1];

  return {
    src: toCandidateUrl(fallbackWidth),
    srcSet: normalizedWidths
      .map((width) => `${toCandidateUrl(width)} ${width}w`)
      .join(", "),
  };
}
