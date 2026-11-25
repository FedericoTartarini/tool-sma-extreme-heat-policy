// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveLocationCoordinates } from "@/api/mapboxRetrieve";
import { suggestLocations } from "@/api/mapboxSuggest";
import type { LocationSuggestion } from "@/domain/location";
import { useHomeLocationSuggest } from "@/hooks/useHomeLocationSuggest";
import { useHomeStore } from "@/store/homeStore";
import { renderHook } from "@/test/renderHook";

vi.mock("@/api/mapboxRetrieve", () => ({
  retrieveLocationCoordinates: vi.fn(),
}));
vi.mock("@/api/mapboxSuggest", () => ({ suggestLocations: vi.fn() }));

function suggestion(name: string, regionName: string, countryName: string) {
  return {
    id: `mbx-${name}-${regionName}`,
    mapboxId: `mbx-${name}-${regionName}`,
    name,
    regionName,
    countryName,
    displayLabel: `${name}, ${regionName}, ${countryName}`,
    sessionToken: "initial",
  } satisfies LocationSuggestion;
}

const singapore: LocationSuggestion = {
  id: "mbx-singapore",
  mapboxId: "mbx-singapore",
  name: "Singapore",
  countryName: "Singapore",
  displayLabel: "Singapore, Singapore",
  sessionToken: "initial",
};
const romeItaly = suggestion("Rome", "Lazio", "Italy");
const romeGeorgia = suggestion("Rome", "Georgia", "United States");
const coordinates = { latitude: 1.29, longitude: 103.85 };

const cleanup: Array<() => void> = [];

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const hook = renderHook(useHomeLocationSuggest, (children) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  ));
  cleanup.push(() => {
    hook.unmount();
    client.clear();
  });
  return hook;
}

/** Lets pending suggest and retrieve promises settle and React re-render. */
async function flush() {
  for (let step = 0; step < 5; step += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function typeInto(hook: ReturnType<typeof mount>, value: string) {
  act(() => hook.current.onLocationSearchInputChange(value));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "test-token");
  vi.stubGlobal("navigator", { language: "en", languages: ["en"] });
  useHomeStore.setState({
    ...useHomeStore.getInitialState(),
    locationSessionToken: "initial",
  });
  vi.mocked(retrieveLocationCoordinates).mockResolvedValue(coordinates);
});

afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("useHomeLocationSuggest search submit", () => {
  it("selects the top suggestion on Enter without waiting for the typing pause", async () => {
    vi.mocked(suggestLocations).mockResolvedValue([singapore]);
    const hook = mount();

    typeInto(hook, "Singapore");
    act(() => hook.current.onLocationSearchSubmit());
    await flush();

    expect(suggestLocations).toHaveBeenCalledWith(
      expect.objectContaining({ query: "Singapore" }),
    );
    expect(useHomeStore.getState().selectedLocation).toEqual({
      ...singapore,
      ...coordinates,
    });
    expect(useHomeStore.getState().locationSearchInput).toBe(
      "Singapore, Singapore",
    );
  });

  it("commits the top-ranked suggestion, the one the dropdown highlights", async () => {
    vi.mocked(suggestLocations).mockResolvedValue([romeGeorgia, romeItaly]);
    const hook = mount();

    typeInto(hook, "rome, lazio, italy");
    act(() => hook.current.onLocationSearchSubmit());
    await flush();

    expect(useHomeStore.getState().selectedLocation?.id).toBe(romeGeorgia.id);
  });

  it("forgets a submit whose search failed, so a later retry does not commit on its own", async () => {
    vi.mocked(suggestLocations).mockRejectedValueOnce(new Error("offline"));
    const hook = mount();

    typeInto(hook, "Rome");
    act(() => hook.current.onLocationSearchSubmit());
    await flush();

    expect(hook.current.suggestErrorReason).toBe("unavailable");
    expect(useHomeStore.getState().pendingLocationSearchSubmit).toBeNull();
  });

  it("drops a pending submit when the user keeps typing", async () => {
    let resolveSuggest!: (suggestions: LocationSuggestion[]) => void;
    vi.mocked(suggestLocations).mockReturnValue(
      new Promise((resolve) => {
        resolveSuggest = resolve;
      }),
    );
    const hook = mount();

    typeInto(hook, "Rom");
    act(() => hook.current.onLocationSearchSubmit());
    await flush();
    expect(suggestLocations).toHaveBeenCalledTimes(1);
    typeInto(hook, "Rome");
    resolveSuggest([romeItaly]);
    await flush();

    expect(retrieveLocationCoordinates).not.toHaveBeenCalled();
    expect(useHomeStore.getState().selectedLocation).toBeNull();
    expect(useHomeStore.getState().locationSearchInput).toBe("Rome");
  });

  it("leaves the typed text and reports no results when nothing matches", async () => {
    vi.mocked(suggestLocations).mockResolvedValue([]);
    const hook = mount();

    typeInto(hook, "Qwxyz");
    act(() => hook.current.onLocationSearchSubmit());
    await flush();

    expect(retrieveLocationCoordinates).not.toHaveBeenCalled();
    expect(useHomeStore.getState().selectedLocation).toBeNull();
    expect(hook.current.suggestErrorReason).toBe("no_results");
  });
});
