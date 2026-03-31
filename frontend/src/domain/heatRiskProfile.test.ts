import { describe, expect, it } from "vitest";
import {
  HEAT_RISK_PROFILE_VALUES,
  heatRiskProfiles,
} from "@/domain/heatRiskProfile";

describe("heatRiskProfiles", () => {
  it("covers each profile exactly once", () => {
    const profileTypes = heatRiskProfiles.map((profile) => profile.type);

    expect(profileTypes).toEqual(HEAT_RISK_PROFILE_VALUES);
    expect(new Set(profileTypes).size).toBe(heatRiskProfiles.length);
  });

  it("preserves the descending age display order", () => {
    expect(heatRiskProfiles).toEqual([
      {
        type: "ADULT",
        labelKey: "home.sections.filters.profileAdult",
        sortOrder: 0,
      },
      {
        type: "AGE_14_17",
        labelKey: "home.sections.filters.profileAge14To17",
        sortOrder: 1,
      },
      {
        type: "AGE_10_13",
        labelKey: "home.sections.filters.profileAge10To13",
        sortOrder: 2,
      },
      {
        type: "UNDER_10",
        labelKey: "home.sections.filters.profileUnder10",
        sortOrder: 3,
      },
    ]);
  });
});
