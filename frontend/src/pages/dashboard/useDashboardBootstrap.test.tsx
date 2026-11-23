// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { savePersistedDashboardState } from "@/pages/dashboard/browserState";
import { useDashboardBootstrap } from "@/pages/dashboard/useDashboardBootstrap";
import { useDashboardStore } from "@/store/dashboardStore";
import { renderHook } from "@/test/renderHook";
import { sydneyCard } from "@/test/weeklyWindowFixtures";

const DASHBOARD_STORAGE_KEY = "dashboard-cards:v1";

const melbourneCard = {
  ...sydneyCard,
  id: "melbourne",
  name: "Melbourne",
  displayLabel: "Melbourne, Victoria, Australia",
  latitude: -37.81,
  longitude: 144.96,
};

/** Stores one readable card next to one the dashboard cannot read. */
function storePartlyUnreadableCards(): string {
  savePersistedDashboardState({ cards: [sydneyCard] });
  const stored = JSON.parse(
    window.localStorage.getItem(DASHBOARD_STORAGE_KEY)!,
  ) as { cards: unknown[] };
  stored.cards.push({ id: "unreadable" });
  const raw = JSON.stringify(stored);
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, raw);
  return raw;
}

/** Mounts the dashboard bootstrap, as visiting `/dashboard` does. */
function visitDashboard() {
  return renderHook(() => useDashboardBootstrap());
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  useDashboardStore.setState({ isBootstrapped: false, cards: [] });
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useDashboardBootstrap", () => {
  it("loads the cards it can read without rewriting storage", () => {
    const raw = storePartlyUnreadableCards();

    visitDashboard().unmount();

    expect(useDashboardStore.getState().cards).toEqual([sydneyCard]);
    expect(window.localStorage.getItem(DASHBOARD_STORAGE_KEY)).toBe(raw);
  });

  it("does not rewrite storage when the dashboard is opened again", () => {
    const raw = storePartlyUnreadableCards();
    visitDashboard().unmount();

    visitDashboard().unmount();

    expect(window.localStorage.getItem(DASHBOARD_STORAGE_KEY)).toBe(raw);
  });

  it("saves the cards once they change", () => {
    storePartlyUnreadableCards();
    visitDashboard().unmount();
    const dashboard = visitDashboard();

    act(() => {
      useDashboardStore.setState({ cards: [sydneyCard, melbourneCard] });
    });
    dashboard.unmount();

    expect(
      JSON.parse(window.localStorage.getItem(DASHBOARD_STORAGE_KEY)!),
    ).toEqual({ cards: [sydneyCard, melbourneCard] });
  });
});
