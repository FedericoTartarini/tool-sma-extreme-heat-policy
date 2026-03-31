const FALLBACK_MARKER_PARAM = "__gh_pages_fallback";
const FALLBACK_PATH_PARAM = "p";
const FALLBACK_QUERY_PARAM = "q";
const FALLBACK_HASH_PARAM = "h";

function normalizeBasePath(basePath: string): string {
  const trimmedBasePath = basePath.trim();

  if (!trimmedBasePath || trimmedBasePath === "/") {
    return "/";
  }

  return `/${trimmedBasePath.replace(/^\/+|\/+$/g, "")}/`;
}

function normalizeRoutePath(routePath: string): string {
  const trimmedRoutePath = routePath.trim();

  if (!trimmedRoutePath || trimmedRoutePath === "/") {
    return "";
  }

  return trimmedRoutePath.replace(/^\/+/, "");
}

/**
 * Resolves the intended SPA route encoded by the GitHub Pages 404 fallback.
 */
export function resolvePagesRedirectUrl(
  search: string,
  basePath: string,
): string | null {
  const searchParams = new URLSearchParams(search.replace(/^\?/, ""));

  if (searchParams.get(FALLBACK_MARKER_PARAM) !== "1") {
    return null;
  }

  const routePath = searchParams.get(FALLBACK_PATH_PARAM);

  if (routePath === null) {
    return null;
  }

  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedRoutePath = normalizeRoutePath(routePath);
  const restoredPath = normalizedRoutePath
    ? `${normalizedBasePath}${normalizedRoutePath}`
    : normalizedBasePath;
  const restoredSearch = searchParams.get(FALLBACK_QUERY_PARAM);
  const restoredHash = searchParams.get(FALLBACK_HASH_PARAM);
  const searchSuffix = restoredSearch ? `?${restoredSearch}` : "";
  const hashSuffix = restoredHash ? `#${restoredHash}` : "";

  return `${restoredPath}${searchSuffix}${hashSuffix}`;
}

/**
 * Restores the original client-side route after a GitHub Pages 404 redirect.
 */
export function restorePagesRedirect(
  search: string,
  history: Pick<History, "replaceState">,
  basePath: string,
): void {
  const restoredUrl = resolvePagesRedirectUrl(search, basePath);

  if (restoredUrl === null) {
    return;
  }

  history.replaceState(null, "", restoredUrl);
}
