// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_HOME_LINK_STATE } from "@/domain/dashboard";
import type { LocationSuggestion } from "@/domain/location";
import { SportType } from "@/domain/sport";
import { useHomeUrlSync } from "@/hooks/useHomeUrlSync";
import { loadPersistedHomeFilters } from "@/pages/home/browserState";
import {
  VALID_PROFILE_VALUES,
  VALID_SPORT_VALUES,
} from "@/pages/home/homeUrlState";
import {
  useHomeBootstrap,
  type SetQueryStates,
} from "@/pages/home/useHomeBootstrap";
import { useHomeStore } from "@/store/homeStore";
import { renderHook } from "@/test/renderHook";

const navigation = vi.hoisted(() => ({
  search: "",
  linkState: null as unknown,
}));

vi.mock("nuqs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("nuqs")>()),
  useQueryStates: () => {
    const params = new URLSearchParams(navigation.search);
    return [
      {
        profile: params.get("profile"),
        sport: params.get("sport"),
        location: params.get("loc"),
      },
      vi.fn(),
    ];
  },
}));
vi.mock("nuqs/adapters/react-router/v7", () => ({
  useOptimisticSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useLocation: () => ({ state: navigation.linkState }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const PERTH = "Perth, Western Australia, Australia";
const DARWIN = "Darwin, Northern Territory, Australia";

const darwin: LocationSuggestion = {
  id: "darwin",
  displayLabel: DARWIN,
  name: "Darwin",
  countryName: "Australia",
  latitude: -12.46,
  longitude: 130.84,
};

/** Opens Home at a URL, the way a page load, card link or Back would. */
function openHome(
  filters: { sport: SportType; loc: string } | null,
  linkState: unknown = null,
) {
  navigation.search = filters ? new URLSearchParams(filters).toString() : "";
  navigation.linkState = linkState;
  const hook = renderHook(() => useHomeBootstrap());
  hook.unmount();
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useHomeStore.setState(useHomeStore.getInitialState());
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useHomeBootstrap", () => {
  it("starts a visit without URL filters as direct, from saved filters", () => {
    window.localStorage.setItem(
      "home-filters:v1",
      JSON.stringify({
        profile: "ADULT",
        sport: SportType.Running,
        loc: DARWIN,
      }),
    );

    openHome(null);

    expect(useHomeStore.getState()).toMatchObject({
      channel: "direct",
      sport: SportType.Running,
      locationSearchInput: DARWIN,
    });
  });

  it("treats URL filters opened from outside the app as a shared link", () => {
    openHome({ sport: SportType.Basketball, loc: PERTH });

    expect(useHomeStore.getState()).toMatchObject({
      channel: "shared",
      sport: SportType.Basketball,
      locationSearchInput: PERTH,
    });
  });

  it("treats a dashboard card link as a direct visit", () => {
    openHome(
      { sport: SportType.Basketball, loc: PERTH },
      DASHBOARD_HOME_LINK_STATE,
    );

    expect(useHomeStore.getState()).toMatchObject({
      channel: "direct",
      sport: SportType.Basketball,
      locationSearchInput: PERTH,
    });
  });

  it("keeps saving filters after going Back to earlier Home filters", () => {
    openHome(
      { sport: SportType.Basketball, loc: PERTH },
      DASHBOARD_HOME_LINK_STATE,
    );

    openHome({ sport: SportType.Running, loc: DARWIN });

    expect(useHomeStore.getState()).toMatchObject({
      channel: "direct",
      sport: SportType.Running,
      locationSearchInput: DARWIN,
    });
  });

  it("saves later choices after going Back to earlier Home filters", async () => {
    openHome(
      { sport: SportType.Basketball, loc: PERTH },
      DASHBOARD_HOME_LINK_STATE,
    );
    openHome({ sport: SportType.Running, loc: DARWIN });
    const setQueryStates = vi.fn<SetQueryStates>(
      async () => new URLSearchParams(),
    );
    const sync = renderHook(() =>
      useHomeUrlSync({ setQueryStates, canSyncSelection: true }),
    );

    await act(async () => {
      useHomeStore.getState().selectLocation(darwin);
    });
    await act(async () => {
      useHomeStore.getState().setSport(SportType.Soccer);
    });
    await act(async () => {});
    sync.unmount();

    expect(
      loadPersistedHomeFilters(VALID_SPORT_VALUES, VALID_PROFILE_VALUES),
    ).toEqual({ profile: "ADULT", sport: SportType.Soccer, loc: DARWIN });
  });

  it("ends a shared-link session when a card link opens the same filters", () => {
    openHome({ sport: SportType.Basketball, loc: PERTH });

    openHome(
      { sport: SportType.Basketball, loc: PERTH },
      DASHBOARD_HOME_LINK_STATE,
    );

    expect(useHomeStore.getState().channel).toBe("direct");
  });
});
