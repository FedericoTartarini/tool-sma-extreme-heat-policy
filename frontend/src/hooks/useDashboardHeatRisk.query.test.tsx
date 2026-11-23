// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchHeatRisk,
  type HeatRiskApiResponse,
  type HeatRiskRequest,
} from "@/api/heatRisk";
import type { SavedDashboardCard } from "@/domain/dashboard";
import { SportType } from "@/domain/sport";
import { useDashboardHeatRisk } from "@/hooks/useDashboardHeatRisk";
import { useDashboardStore } from "@/store/dashboardStore";
import { renderHook } from "@/test/renderHook";
import {
  sydneyCard,
  sydneyHeatRiskResponse,
} from "@/test/weeklyWindowFixtures";

vi.mock("@/api/heatRisk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/heatRisk")>()),
  fetchHeatRisk: vi.fn(),
}));

const melbourneCard: SavedDashboardCard = {
  ...sydneyCard,
  id: "melbourne",
  sport: SportType.Running,
  name: "Melbourne",
  displayLabel: "Melbourne, Victoria, Australia",
  latitude: -37.81,
  longitude: 144.96,
};

/** A forecast whose current risk tells the two cards apart. */
function responseFor(
  request: HeatRiskRequest,
  currentRisk: number,
): HeatRiskApiResponse {
  const response = sydneyHeatRiskResponse();

  return {
    request: {
      ...response.request,
      sport: request.sport,
      location: {
        ...response.request.location,
        latitude: request.latitude,
        longitude: request.longitude,
      },
    },
    forecast: response.forecast.map((point) => ({
      ...point,
      heat_risk: { ...point.heat_risk, risk_level_interpolated: currentRisk },
    })),
  };
}

const unmounts: Array<() => void> = [];

async function renderDashboardRisk(cards: SavedDashboardCard[]) {
  useDashboardStore.setState({ cards });
  const client = new QueryClient();
  const hook = renderHook(
    () => useDashboardHeatRisk(),
    (children) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  );
  unmounts.push(() => {
    hook.unmount();
    client.clear();
  });
  // React Query reports results on a later task, not a microtask.
  for (let tick = 0; tick < 3; tick++) {
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  }
  return hook;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(fetchHeatRisk).mockImplementation(async (request) => ({
    ok: true,
    data: responseFor(request, request.sport === SportType.Running ? 2.4 : 1.2),
  }));
});

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  vi.mocked(fetchHeatRisk).mockReset();
  vi.unstubAllGlobals();
});

describe("useDashboardHeatRisk with React Query", () => {
  it("requests each card's own location and sport", async () => {
    await renderDashboardRisk([sydneyCard, melbourneCard]);

    expect(fetchHeatRisk).toHaveBeenCalledTimes(2);
    expect(fetchHeatRisk).toHaveBeenCalledWith(
      {
        sport: sydneyCard.sport,
        latitude: sydneyCard.latitude,
        longitude: sydneyCard.longitude,
        profile: "ADULT",
      },
      { signal: expect.any(AbortSignal) },
    );
    expect(fetchHeatRisk).toHaveBeenCalledWith(
      {
        sport: melbourneCard.sport,
        latitude: melbourneCard.latitude,
        longitude: melbourneCard.longitude,
        profile: "ADULT",
      },
      { signal: expect.any(AbortSignal) },
    );
  });

  it("shows each card the forecast for its own location and sport", async () => {
    const hook = await renderDashboardRisk([sydneyCard, melbourneCard]);

    expect(hook.current.getCardState(sydneyCard)).toMatchObject({
      status: "ok",
      currentRiskScore: 1.2,
    });
    expect(hook.current.getCardState(melbourneCard)).toMatchObject({
      status: "ok",
      currentRiskScore: 2.4,
    });
  });

  it("shares one request between cards with the same location and sport", async () => {
    const sydneyCopy = { ...sydneyCard, id: "sydney-copy" };

    const hook = await renderDashboardRisk([sydneyCard, sydneyCopy]);

    expect(fetchHeatRisk).toHaveBeenCalledOnce();
    expect(hook.current.getCardState(sydneyCopy)).toMatchObject({
      status: "ok",
      currentRiskScore: 1.2,
    });
  });
});
