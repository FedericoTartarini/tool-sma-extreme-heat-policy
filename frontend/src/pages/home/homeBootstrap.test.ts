import { describe, expect, it } from "vitest";
import { DEFAULT_SPORT_TYPE, SportType } from "@/domain/sport";
import { resolveHomeBootstrapState } from "@/pages/home/homeBootstrap";

describe("resolveHomeBootstrapState", () => {
  it("prefers URL state over persisted filters", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: true,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "Sydney, AU",
        urlSport: SportType.Basketball,
        urlLocation: "  Perth, AU  ",
        persistedFilters: {
          sport: SportType.Running,
          loc: "Dampier, AU",
        },
      }),
    ).toEqual({
      channel: "shared",
      sport: SportType.Basketball,
      locationSearchInput: "Perth, AU",
      locationPrefillSource: "url",
      shouldAutoResolvePrefilledLocation: true,
    });
  });

  it("uses persisted filters when no URL state is present", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: false,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "Sydney, AU",
        urlSport: null,
        urlLocation: null,
        persistedFilters: {
          sport: SportType.Running,
          loc: "  Dampier, AU  ",
        },
      }),
    ).toEqual({
      channel: "direct",
      sport: SportType.Running,
      locationSearchInput: "Dampier, AU",
      locationPrefillSource: "persisted",
      shouldAutoResolvePrefilledLocation: true,
    });
  });

  it("falls back to the default label when neither URL nor persisted state exists", () => {
    expect(
      resolveHomeBootstrapState({
        hasUrlState: false,
        defaultSport: DEFAULT_SPORT_TYPE,
        defaultLocationLabel: "  Sydney, AU  ",
        urlSport: null,
        urlLocation: null,
        persistedFilters: null,
      }),
    ).toEqual({
      channel: "direct",
      sport: DEFAULT_SPORT_TYPE,
      locationSearchInput: "Sydney, AU",
      locationPrefillSource: "default",
      shouldAutoResolvePrefilledLocation: true,
    });
  });
});
