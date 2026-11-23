// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocationSuggestion } from "@/domain/location";
import { SportType } from "@/domain/sport";
import {
  type DashboardLocationAddErrorReason,
  useDashboardLocationAdd,
} from "@/hooks/useDashboardLocationAdd";
import { useDashboardStore } from "@/store/dashboardStore";

const SYDNEY_LOCATION: LocationSuggestion = {
  id: "suggestion-sydney",
  displayLabel: "Sydney, New South Wales, Australia",
  name: "Sydney",
  regionName: "New South Wales",
  countryName: "Australia",
  mapboxId: "mapbox-sydney",
  latitude: -33.847,
  longitude: 151.067,
};

let host: HTMLDivElement;
let root: Root;
let addForm: ReturnType<typeof useDashboardLocationAdd>;

function Probe({
  onRender,
}: {
  onRender: (result: ReturnType<typeof useDashboardLocationAdd>) => void;
}) {
  onRender(useDashboardLocationAdd());
  return null;
}

function fillDraft() {
  act(() => {
    useDashboardStore.getState().setDraftLocation(SYDNEY_LOCATION);
    addForm.onDraftWeekdaysChange([2, 4]);
    addForm.onDraftStartMinutesChange(1080);
    addForm.onDraftEndMinutesChange(1200);
  });
}

function clickAdd(): DashboardLocationAddErrorReason | null {
  let reason: DashboardLocationAddErrorReason | null = null;
  act(() => {
    reason = addForm.onAddCardClick();
  });
  return reason;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "test-token");
  useDashboardStore.setState({
    draftSport: SportType.Soccer,
    draftLocation: null,
    cards: [],
    locationSearchInput: "",
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root.render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(Probe, {
          onRender: (result) => {
            addForm = result;
          },
        }),
      ),
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  window.localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("dashboard location add", () => {
  it("reports every failed add, including a repeated duplicate", () => {
    fillDraft();
    expect(clickAdd()).toBeNull();
    expect(useDashboardStore.getState().cards).toHaveLength(1);

    fillDraft();
    expect(clickAdd()).toBe("duplicate");
    expect(clickAdd()).toBe("duplicate");

    expect(addForm.addErrorReason).toBeNull();
    expect(useDashboardStore.getState().cards).toHaveLength(1);
  });
});
