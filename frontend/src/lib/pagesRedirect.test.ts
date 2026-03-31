import { describe, expect, it, vi } from "vitest";
import {
  resolvePagesRedirectUrl,
  restorePagesRedirect,
} from "@/lib/pagesRedirect";

describe("resolvePagesRedirectUrl", () => {
  it("returns null when the fallback marker is absent", () => {
    expect(resolvePagesRedirectUrl("?p=%2Fabout", "/tool")).toBeNull();
  });

  it("restores the original route, query string, and hash", () => {
    expect(
      resolvePagesRedirectUrl(
        "?__gh_pages_fallback=1&p=%2Fabout&q=tab%3Dforecast%26mode%3Dhourly&h=details",
        "/tool-sma-extreme-heat-policy",
      ),
    ).toBe(
      "/tool-sma-extreme-heat-policy/about?tab=forecast&mode=hourly#details",
    );
  });

  it("normalizes root restores back to the base path", () => {
    expect(
      resolvePagesRedirectUrl("?__gh_pages_fallback=1&p=%2F", "/tool"),
    ).toBe("/tool/");
  });
});

describe("restorePagesRedirect", () => {
  it("updates browser history when a fallback URL is present", () => {
    const replaceState = vi.fn();

    restorePagesRedirect(
      "?__gh_pages_fallback=1&p=%2Fdetailed-recommendations",
      { replaceState },
      "/tool-sma-extreme-heat-policy/",
    );

    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/tool-sma-extreme-heat-policy/detailed-recommendations",
    );
  });
});
