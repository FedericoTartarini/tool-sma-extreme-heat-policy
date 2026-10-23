// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RiskStackedBar } from "@/components/dashboard/RiskStackedBar";
import { RISK_STACKED_BAR_TRACK_INSET } from "@/config/uiScale";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

beforeEach(async () => {
  harness = await createDashboardComponentHost();
});

afterEach(() => {
  harness.cleanup();
});

describe("RiskStackedBar", () => {
  it("renders an accessible summary of the score and risk level", () => {
    harness.render(createElement(RiskStackedBar, { score: 2.2 }), {
      withRouter: false,
    });

    expect(harness.host.textContent).toContain("2.2");
    expect(
      harness.host.querySelector('[aria-label="Risk score 2.2, Moderate"]'),
    ).not.toBeNull();
  });

  it("anchors the marker at the inset track start when the display score is zero", () => {
    harness.render(createElement(RiskStackedBar, { score: 1.0 }), {
      withRouter: false,
    });

    const marker = harness.host.querySelector('[aria-hidden="true"]');

    expect(marker).not.toBeNull();
    expect((marker as HTMLElement).style.left).toBe(
      RISK_STACKED_BAR_TRACK_INSET,
    );
    expect((marker as HTMLElement).style.transform).toBe("none");
  });
});
