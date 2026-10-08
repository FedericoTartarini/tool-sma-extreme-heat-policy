import { describe, expect, it } from "vitest";
import { RISK_LEVELS, RISK_REGISTRY } from "@/domain/riskRegistry";
import { RISK_LEVEL_META } from "@/domain/riskMeta";

describe("RISK_LEVEL_META", () => {
  it("exposes registry action assets through the legacy metadata", () => {
    for (const level of RISK_LEVELS) {
      expect(RISK_LEVEL_META[level].keyIconAssets).toBe(
        RISK_REGISTRY[level].keyIconAssets,
      );
    }
  });
});
