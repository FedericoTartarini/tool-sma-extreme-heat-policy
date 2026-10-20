import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import type { ResponsiveImageAsset } from "@/lib/responsiveImage";

export function expectResponsiveImageFilesToExist(
  image: ResponsiveImageAsset,
  assetName: string,
): void {
  const imageUrls = [
    image.src,
    ...image.srcSet
      .split(",")
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .filter(Boolean),
  ];

  for (const imageUrl of imageUrls) {
    const assetPath = join(
      process.cwd(),
      "public",
      imageUrl.replace(/^\/+/, ""),
    );

    expect(
      existsSync(assetPath),
      `${assetName} references missing asset ${imageUrl}`,
    ).toBe(true);
  }
}
