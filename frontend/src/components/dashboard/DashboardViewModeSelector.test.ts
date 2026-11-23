// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardViewModeSelector } from "@/components/dashboard/DashboardViewModeSelector";
import { createDefaultDashboardOtherPeriodDraft } from "@/domain/dashboardOtherPeriod";
import { useDashboardStore } from "@/store/dashboardStore";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

beforeEach(async () => {
  useDashboardStore.setState({
    otherPeriodDraft: createDefaultDashboardOtherPeriodDraft(
      new Date("2026-09-15T00:00:00Z"),
    ),
  });
  harness = await createDashboardComponentHost();
});

afterEach(() => {
  harness.cleanup();
});

describe("DashboardViewModeSelector", () => {
  it("renders all dashboard view mode options", () => {
    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "now",
        onChange: vi.fn(),
      }),
      { withRouter: false },
    );

    expect(harness.host.textContent).toContain("Now");
    expect(harness.host.textContent).toContain("My schedule");
    expect(harness.host.textContent).toContain("Other time period");
  });

  it("does not show a placeholder for the implemented My schedule mode", () => {
    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "my_schedule",
        onChange: vi.fn(),
      }),
      { withRouter: false },
    );

    expect(harness.host.textContent).not.toContain("coming soon");
  });

  it("shows the other-period date and time fields", () => {
    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "other_time_period",
        onChange: vi.fn(),
      }),
      { withRouter: false },
    );

    expect(harness.host.textContent).toContain("Day");
    expect(harness.host.textContent).toContain(
      "time range to view for all cards",
    );
    expect(harness.host.textContent).toContain("Sun");
    expect(
      harness.host.querySelector('[role="group"][aria-label="Day"]'),
    ).not.toHaveProperty("style.width", "100%");
    expect(
      harness.host.querySelector('input[aria-label="Start time"]'),
    ).not.toBeNull();
    expect(harness.host.textContent).not.toContain("coming soon");
  });

  it("shows an invalid-range hint for overnight other-period times", () => {
    useDashboardStore.setState({
      otherPeriodDraft: {
        weekday: 2,
        startMinutes: 1080,
        endMinutes: 540,
      },
    });

    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "other_time_period",
        onChange: vi.fn(),
      }),
      { withRouter: false },
    );

    expect(harness.host.textContent).toContain(
      "Overnight windows are not supported",
    );
  });

  it("calls onChange when a different mode is selected", () => {
    const onChange = vi.fn();

    harness.render(
      createElement(DashboardViewModeSelector, {
        value: "now",
        onChange,
      }),
      { withRouter: false },
    );

    const scheduleOption = Array.from(
      harness.host.querySelectorAll("label"),
    ).find((label) => label.textContent === "My schedule");

    expect(scheduleOption).toBeDefined();
    scheduleOption?.click();

    expect(onChange).toHaveBeenCalledWith("my_schedule");
  });
});
