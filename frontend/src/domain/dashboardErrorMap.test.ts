import { describe, expect, it } from "vitest";
import {
  toDashboardFetchErrorI18nKey,
  toDashboardLocationErrorI18nKey,
} from "@/domain/dashboardErrorMap";

describe("dashboardErrorMap", () => {
  it("maps fetch failures to shared risk error copy", () => {
    expect(toDashboardFetchErrorI18nKey("network")).toBe("errors.risk.network");
  });

  it("maps unknown inputs to dashboard card copy", () => {
    expect(toDashboardLocationErrorI18nKey("unknown_inputs")).toBe(
      "dashboard.cardErrors.unknownInputs",
    );
  });
});
