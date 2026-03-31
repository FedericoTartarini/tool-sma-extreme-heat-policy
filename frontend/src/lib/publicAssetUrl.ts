/**
 * Prefixes a public asset path with the app base URL for subpath deployments.
 */
export function toPublicAssetUrl(assetPath: string): string {
  const baseUrl =
    import.meta.env.BASE_URL && import.meta.env.BASE_URL !== ""
      ? import.meta.env.BASE_URL
      : "/";

  return `${baseUrl}${assetPath.replace(/^\/+/, "")}`;
}
