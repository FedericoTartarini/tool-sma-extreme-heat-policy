// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocationSuggestion } from "@/domain/location";
import { SportType } from "@/domain/sport";
import { useHomeUrlSync } from "@/hooks/useHomeUrlSync";
import { loadPersistedHomeFilters } from "@/pages/home/browserState";
import {
  VALID_PROFILE_VALUES,
  VALID_SPORT_VALUES,
} from "@/pages/home/homeUrlState";
import type { SetQueryStates } from "@/pages/home/useHomeBootstrap";
import { useHomeStore } from "@/store/homeStore";
import { renderHook } from "@/test/renderHook";

const perth: LocationSuggestion = {
  id: "perth",
  displayLabel: "Perth, Western Australia, Australia",
  name: "Perth",
  countryName: "Australia",
  latitude: -31.95,
  longitude: 115.86,
};

const setQueryStates = vi.fn<SetQueryStates>(async () => new URLSearchParams());
const unmounts: Array<() => void> = [];

async function syncHome(canSyncSelection = true) {
  const hook = renderHook(() =>
    useHomeUrlSync({ setQueryStates, canSyncSelection }),
  );
  unmounts.push(hook.unmount);
  // Let the URL write settle before the selection is saved.
  await act(async () => {});
}

function savedFilters() {
  return loadPersistedHomeFilters(VALID_SPORT_VALUES, VALID_PROFILE_VALUES);
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useHomeStore.setState({
    ...useHomeStore.getInitialState(),
    isBootstrapped: true,
    sport: SportType.Basketball,
    selectedLocation: perth,
  });
  window.localStorage.clear();
  setQueryStates.mockClear();
});

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  vi.unstubAllGlobals();
});

describe("useHomeUrlSync", () => {
  it("writes the selection to the URL with replace history", async () => {
    await syncHome();

    expect(setQueryStates).toHaveBeenCalledWith(
      {
        profile: "ADULT",
        sport: SportType.Basketball,
        location: perth.displayLabel,
      },
      { history: "replace" },
    );
  });

  it("saves the selection on a direct visit", async () => {
    useHomeStore.setState({ channel: "direct" });

    await syncHome();

    expect(savedFilters()).toEqual({
      profile: "ADULT",
      sport: SportType.Basketball,
      loc: perth.displayLabel,
    });
  });

  it("does not save the selection from a shared link", async () => {
    useHomeStore.setState({ channel: "shared" });

    await syncHome();

    expect(setQueryStates).toHaveBeenCalledOnce();
    expect(savedFilters()).toBeNull();
  });

  it("writes nothing until the selection can be synced", async () => {
    await syncHome(false);

    expect(setQueryStates).not.toHaveBeenCalled();
    expect(savedFilters()).toBeNull();
  });

  it("writes a new sport choice", async () => {
    await syncHome();

    await act(async () => {
      useHomeStore.getState().setSport(SportType.Running);
    });
    await act(async () => {});

    expect(setQueryStates).toHaveBeenLastCalledWith(
      {
        profile: "ADULT",
        sport: SportType.Running,
        location: perth.displayLabel,
      },
      { history: "replace" },
    );
    expect(savedFilters()?.sport).toBe(SportType.Running);
  });
});
