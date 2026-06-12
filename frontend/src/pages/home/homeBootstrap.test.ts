import { describe, expect, it } from "vitest";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import { DEFAULT_SPORT_TYPE, SportType } from "@/domain/sport";
import type { PersistedHomeFilters } from "@/pages/home/browserState";
import { resolveHomeBootstrapState } from "@/pages/home/homeBootstrap";

describe("resolveHomeBootstrapState", () => {
  it("keeps the default adult profile when URL state provides a younger profile", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: true,
        defaultProfile: DEFAULT_HEAT_RISK_PROFILE,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "Sydney, New South Wales, Australia",
        urlProfile: "AGE_10_13",
        urlSport: SportType.Basketball,
        urlLocation: "  Perth, Western Australia, Australia  ",
        persistedFilters: {
          profile: "UNDER_10",
          sport: SportType.Running,
          loc: "Dampier, Western Australia, Australia",
        },
      }),
    ).toEqual({
      channel: "shared",
      profile: DEFAULT_HEAT_RISK_PROFILE,
      sport: SportType.Basketball,
      locationSearchInput: "Perth, Western Australia, Australia",
      locationPrefillSource: "url",
      prefilledLocationResolveState: "pending",
    });
  });

  it("keeps the default adult profile when persisted filters store a younger profile", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: false,
        defaultProfile: DEFAULT_HEAT_RISK_PROFILE,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "Sydney, New South Wales, Australia",
        urlProfile: null,
        urlSport: null,
        urlLocation: null,
        persistedFilters: {
          profile: "AGE_14_17",
          sport: SportType.Running,
          loc: "  Dampier, Western Australia, Australia  ",
        },
      }),
    ).toEqual({
      channel: "direct",
      profile: DEFAULT_HEAT_RISK_PROFILE,
      sport: SportType.Running,
      locationSearchInput: "Dampier, Western Australia, Australia",
      locationPrefillSource: "persisted",
      prefilledLocationResolveState: "pending",
    });
  });

  it("falls back to the default label when neither URL nor persisted state exists", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: false,
        defaultProfile: DEFAULT_HEAT_RISK_PROFILE,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "  Sydney, New South Wales, Australia  ",
        urlProfile: null,
        urlSport: null,
        urlLocation: null,
        persistedFilters: null,
      }),
    ).toEqual({
      channel: "direct",
      profile: DEFAULT_HEAT_RISK_PROFILE,
      sport: DEFAULT_SPORT_TYPE,
      locationSearchInput: "Sydney, New South Wales, Australia",
      locationPrefillSource: "default",
      prefilledLocationResolveState: "pending",
    });
  });

  it("falls back to the default profile when persisted data has no profile", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: false,
        defaultProfile: DEFAULT_HEAT_RISK_PROFILE,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "Sydney, New South Wales, Australia",
        urlProfile: null,
        urlSport: null,
        urlLocation: null,
        persistedFilters: {
          sport: SportType.Running,
          loc: "Perth, Western Australia, Australia",
        } as PersistedHomeFilters,
      }),
    ).toEqual({
      channel: "direct",
      profile: DEFAULT_HEAT_RISK_PROFILE,
      sport: SportType.Running,
      locationSearchInput: "Perth, Western Australia, Australia",
      locationPrefillSource: "persisted",
      prefilledLocationResolveState: "pending",
    });
  });

  it("leaves prefilled location resolve idle when no location is available", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: false,
        defaultProfile: DEFAULT_HEAT_RISK_PROFILE,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "   ",
        urlProfile: null,
        urlSport: null,
        urlLocation: null,
        persistedFilters: null,
      }),
    ).toEqual({
      channel: "direct",
      profile: DEFAULT_HEAT_RISK_PROFILE,
      sport: DEFAULT_SPORT_TYPE,
      locationSearchInput: "",
      locationPrefillSource: "none",
      prefilledLocationResolveState: "idle",
    });
  });
});
