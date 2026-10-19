// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DashboardOverviewSection } from "@/components/dashboard/DashboardOverviewSection";
import { useDashboardStore } from "@/store/dashboardStore";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";
import { sydneyCard } from "@/test/weeklyWindowFixtures";

const EMPTY_STATE_TEXT =
  "No saved cards on your dashboard yet. Start monitoring heat risk by adding a card.";
const VIEW_MODE_SELECTOR = '[aria-label="Dashboard mode"]';
const RECOMMENDATIONS_LINK = 'a[href="/detailed-recommendations"]';

function findSummaryToggle(): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) =>
    button.hasAttribute("aria-expanded"),
  );
}

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

  it("shows the dashboard mode selector once a card is saved", () => {
    useDashboardStore.setState({ cards: [sydneyCard] });
    harness.render(createElement(DashboardOverviewSection));

    expect(document.querySelector(VIEW_MODE_SELECTOR)).not.toBeNull();
  });

  it("hides the dashboard mode selector when no cards are saved", () => {
    harness.render(createElement(DashboardOverviewSection));

    expect(document.querySelector(VIEW_MODE_SELECTOR)).toBeNull();
  });

  it("shows the summary without a toggle when no cards are saved", () => {
    harness.render(createElement(DashboardOverviewSection));

    expect(findSummaryToggle()).toBeUndefined();
    expect(document.querySelector(RECOMMENDATIONS_LINK)).not.toBeNull();
  });

  it("collapses the summary once a card is saved", () => {
    useDashboardStore.setState({ cards: [sydneyCard] });
    harness.render(createElement(DashboardOverviewSection));

    const toggle = findSummaryToggle();
    expect(toggle?.textContent).toBe("Show dashboard info");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    const summary = document.getElementById(
      toggle!.getAttribute("aria-controls")!,
    );
    expect(summary?.getAttribute("aria-hidden")).toBe("true");
  });

  it("expands the collapsed summary when the toggle is clicked", () => {
    useDashboardStore.setState({ cards: [sydneyCard] });
    harness.render(createElement(DashboardOverviewSection));

    const toggle = findSummaryToggle()!;
    act(() => toggle.click());

    expect(toggle.textContent).toBe("Hide dashboard info");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const summary = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    );
    expect(summary?.getAttribute("aria-hidden")).toBe("false");
    expect(summary?.querySelector(RECOMMENDATIONS_LINK)).not.toBeNull();
  });
});
