import { describe, expect, it } from "vitest";
import {
  getSportImageFailureUrl,
  type SportImageFailure,
} from "@/lib/sportImageFailure";

describe("getSportImageFailureUrl", () => {
  const failure: SportImageFailure = {
    sport: "BASKETBALL",
    url: "/sports/basketball-640.webp",
  };

  it("keeps the failure while the failed sport stays selected", () => {
    expect(getSportImageFailureUrl(failure, "BASKETBALL")).toBe(
      "/sports/basketball-640.webp",
    );
  });

  it("resets the failure when the sport changes from any source", () => {
    expect(getSportImageFailureUrl(failure, "SOCCER")).toBeNull();
  });

  it("reports no failure before an image has failed", () => {
    expect(getSportImageFailureUrl(null, "BASKETBALL")).toBeNull();
  });
});
