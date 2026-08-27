import { describe, expect, it } from "vitest";
import { isSharedNavigationInProgress } from "@/hooks/useHomeUrlSync";

describe("isSharedNavigationInProgress", () => {
  it("blocks URL sync while a shared location is still resolving", () => {
    expect(
      isSharedNavigationInProgress({
        channel: "shared",
        urlLocation: "Perth, Western Australia, Australia",
        prefilledLocationResolveState: "pending",
      }),
    ).toBe(true);

    expect(
      isSharedNavigationInProgress({
        channel: "shared",
        urlLocation: "Perth, Western Australia, Australia",
        prefilledLocationResolveState: "resolving",
      }),
    ).toBe(true);
  });

  it("allows URL sync after a user selects a different city on a shared visit", () => {
    expect(
      isSharedNavigationInProgress({
        channel: "shared",
        urlLocation: "Perth, Western Australia, Australia",
        prefilledLocationResolveState: "idle",
      }),
    ).toBe(false);
  });

  it("does not treat direct visits as shared navigation", () => {
    expect(
      isSharedNavigationInProgress({
        channel: "direct",
        urlLocation: "Perth, Western Australia, Australia",
        prefilledLocationResolveState: "pending",
      }),
    ).toBe(false);
  });
});
