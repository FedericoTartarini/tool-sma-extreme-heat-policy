export function getImageLoadFailureUrl(
  image: Pick<HTMLImageElement, "currentSrc" | "src">,
): string {
  return image.currentSrc || image.src;
}
