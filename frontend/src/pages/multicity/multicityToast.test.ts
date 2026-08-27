import { describe, expect, it } from "vitest";
import {
  createMulticityRiskUpdatedToast,
  MULTICITY_SUCCESS_TOAST_DURATION_MS,
} from "@/pages/multicity/multicityToast";

describe("multicityToast", () => {
  it("creates a short success toast for refreshed dashboard risk", () => {
    expect(createMulticityRiskUpdatedToast(7)).toEqual({
      id: 7,
      i18nKey: "multicity.notifications.riskUpdated",
      variant: "success",
      durationMs: MULTICITY_SUCCESS_TOAST_DURATION_MS,
    });
  });
});
