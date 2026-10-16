// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DashboardOverviewSection } from "@/components/dashboard/DashboardOverviewSection";
import { useDashboardStore } from "@/store/dashboardStore";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";
import { sydneyCard } from "@/test/weeklyWindowFixtures";

const EMPTY_STATE_TEXT =
  "No saved cards on your dashboard yet. Start monitoring heat risk by adding a card.";

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

beforeEach(async () => {
  useDashboardStore.setState({ cards: [] });
  harness = await createDashboardComponentHost();
});

afterEach(() => {
  harness.cleanup();
});

describe("DashboardOverviewSection", () => {
  it("links to detailed recommendations in the header summary", () => {
    harness.render(createElement(DashboardOverviewSection));

    const recommendationsLink = document.querySelector(
      'a[href="/detailed-recommendations"]',
    );
    expect(recommendationsLink).not.toBeNull();
    expect(recommendationsLink?.textContent).toBe("detailed recommendations");
  });

  it("shows the empty-state message when no cards are saved", () => {
    harness.render(createElement(DashboardOverviewSection));

    expect(document.body.textContent).toContain(EMPTY_STATE_TEXT);
  });

  it("hides the empty-state message once a card is saved", () => {
    useDashboardStore.setState({ cards: [sydneyCard] });
    harness.render(createElement(DashboardOverviewSection));

    expect(document.body.textContent).not.toContain(EMPTY_STATE_TEXT);
  });
});
