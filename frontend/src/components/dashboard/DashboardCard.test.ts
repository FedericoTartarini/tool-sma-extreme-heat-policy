// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type {
  DashboardCardSchedule,
  SavedDashboardCard,
} from "@/domain/dashboard";
import type { DashboardCardState } from "@/domain/dashboardCardState";
import type { DashboardOtherPeriodCardState } from "@/domain/dashboardOtherPeriodCardState";
import type { DashboardScheduledCardState } from "@/domain/dashboardScheduledCardState";
import { sydneyCard as baseSydneyCard } from "@/test/weeklyWindowFixtures";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";

const sydneyCard: SavedDashboardCard = {
  ...baseSydneyCard,
  regionName: "New South Wales",
};

const eveningSchedule: DashboardCardSchedule = {
  weekdays: [2, 4],
  startMinutes: 1080,
  endMinutes: 1200,
};

const OK_CARD_STATE: DashboardCardState = {
  status: "ok",
  currentRiskScore: 1.4,
  todayMaxRiskScore: 2.8,
  currentRiskLevel: "low",
  todayMaxRiskLevel: "high",
};

const OK_SCHEDULED_CARD_STATE: DashboardScheduledCardState = {
  status: "ok",
  window: {
    localDate: "2026-09-15",
    timeZone: "Australia/Sydney",
    startUtc: "2026-09-15T08:00:00.000Z",
    endUtc: "2026-09-15T10:00:00.000Z",
  },
  averageRiskScore: 1.6,
  minRiskScore: 0.9,
  maxRiskScore: 2.3,
  averageRiskLevel: "low",
  minRiskLevel: "low",
  maxRiskLevel: "moderate",
};

const OK_OTHER_PERIOD_CARD_STATE: DashboardOtherPeriodCardState =
  OK_SCHEDULED_CARD_STATE;

const CARD_ACTIONS = {
  index: 0,
  totalCount: 1,
  onRemove: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  onUpdateSchedule: vi.fn(() => ({ ok: true }) as const),
};

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

beforeEach(async () => {
  harness = await createDashboardComponentHost();
});

afterEach(() => {
  harness.cleanup();
  vi.clearAllMocks();
});

function renderCard(
  card: SavedDashboardCard = sydneyCard,
  viewMode: "now" | "my_schedule" | "other_time_period" = "now",
  cardState: DashboardCardState = OK_CARD_STATE,
) {
  harness.render(
    createElement(DashboardCard, {
      card,
      cardState,
      scheduledCardState:
        viewMode === "my_schedule"
          ? cardState.status === "ok"
            ? OK_SCHEDULED_CARD_STATE
            : cardState
          : null,
      otherPeriodCardState:
        viewMode === "other_time_period"
          ? cardState.status === "ok"
            ? OK_OTHER_PERIOD_CARD_STATE
            : cardState
          : null,
      viewMode,
      ...CARD_ACTIONS,
    }),
  );
}

describe("DashboardCard", () => {
  it("renders stacked bar metrics in Now mode", () => {
    renderCard();

    expect(harness.host.textContent).toContain("Current");
    expect(
      harness.host.querySelector('[aria-label="Risk score 1.4, Low"]'),
    ).not.toBeNull();
    expect(harness.host.textContent).toContain("Max risk (today):");
  });

  it("renders average and explicit Min/Max metrics in My schedule mode", () => {
    renderCard(sydneyCard, "my_schedule");

    expect(harness.host.textContent).toContain("Next session ·");
    expect(harness.host.textContent).toContain("Sep");
    expect(harness.host.textContent).toContain("Average");
    expect(harness.host.textContent).not.toContain("Average (next session on");
    expect(
      harness.host.querySelector('[aria-label="Risk score 1.6, Low"]'),
    ).not.toBeNull();
    expect(harness.host.textContent).toContain("Min: 0.9 LOW");
    expect(harness.host.textContent).toContain("Max: 2.3 MODERATE");
  });

  it("does not show a separate next session details line in My schedule mode", () => {
    renderCard({ ...sydneyCard, schedule: eveningSchedule }, "my_schedule");

    expect(harness.host.textContent).not.toContain("Next session details:");
    expect(harness.host.textContent).toContain("Next session ·");
  });

  it("shows the unresolved date without My schedule wording", () => {
    harness.render(
      createElement(DashboardCard, {
        card: sydneyCard,
        cardState: OK_CARD_STATE,
        scheduledCardState: null,
        otherPeriodCardState: {
          status: "unresolved_local_time",
          localDate: "2026-10-04",
          timeZone: "Australia/Sydney",
        },
        viewMode: "other_time_period",
        ...CARD_ACTIONS,
      }),
    );

    expect(harness.host.textContent).toContain("Selected ·");
    expect(harness.host.textContent).toContain("4 Oct");
    expect(harness.host.textContent).toContain(
      "The selected time period could not be calculated for this location.",
    );
    expect(harness.host.textContent).not.toContain("next scheduled window");
  });

  it("does not repeat an incomplete selection on the card", () => {
    harness.render(
      createElement(DashboardCard, {
        card: sydneyCard,
        cardState: OK_CARD_STATE,
        scheduledCardState: null,
        otherPeriodCardState: { status: "missing_selection" },
        viewMode: "other_time_period",
        ...CARD_ACTIONS,
      }),
    );

    expect(harness.host.textContent).not.toContain("Choose a day");
    expect(harness.host.textContent).not.toContain("Average");
  });

  it("shows other-period forecast coverage copy instead of My schedule wording", () => {
    harness.render(
      createElement(DashboardCard, {
        card: sydneyCard,
        cardState: OK_CARD_STATE,
        scheduledCardState: null,
        otherPeriodCardState: {
          status: "incomplete_forecast",
          window: OK_SCHEDULED_CARD_STATE.window,
        },
        viewMode: "other_time_period",
        ...CARD_ACTIONS,
      }),
    );

    expect(harness.host.textContent).toContain(
      "Forecast data does not cover the selected time period at this location.",
    );
    expect(harness.host.textContent).not.toContain("next scheduled window");
    expect(harness.host.textContent).not.toContain("Average");
  });

  it("renders average and explicit Min/Max metrics in Other time period mode", () => {
    renderCard(sydneyCard, "other_time_period");

    expect(harness.host.textContent).toContain("Selected ·");
    expect(harness.host.textContent).toContain("Average");
    expect(harness.host.textContent).not.toContain("Next session ·");
    expect(harness.host.textContent).toContain("Min: 0.9 LOW");
    expect(harness.host.textContent).toContain("Max: 2.3 MODERATE");
    expect(harness.host.textContent).not.toContain(
      "The forecast only covers this period from",
    );
  });

  it("explains when risk covers only part of the selected period", () => {
    harness.render(
      createElement(DashboardCard, {
        card: sydneyCard,
        cardState: OK_CARD_STATE,
        scheduledCardState: null,
        otherPeriodCardState: {
          ...OK_OTHER_PERIOD_CARD_STATE,
          coveredFromUtc: "2026-09-15T09:00:00.000Z",
        },
        viewMode: "other_time_period",
        ...CARD_ACTIONS,
      }),
    );

    expect(harness.host.textContent).toContain("Average");
    expect(harness.host.textContent).toContain(
      "The forecast only covers this period from 7:00",
    );
    expect(harness.host.textContent).toContain(
      "Earlier hours are not included.",
    );
  });

  it("shows fetch errors instead of metrics placeholders", () => {
    renderCard(sydneyCard, "my_schedule", {
      status: "fetch_error",
      reason: "network",
    });

    expect(harness.host.textContent).toContain(
      "Risk calculation is unavailable.",
    );
    expect(harness.host.textContent).not.toContain("Average");
  });
});

describe("dashboard card schedule", () => {
  it("hides the schedule line in Now mode", () => {
    renderCard({ ...sydneyCard, schedule: eveningSchedule }, "now");

    expect(harness.host.textContent).not.toContain(
      "Tue, Thu · 6:00 pm – 8:00 pm",
    );
  });

  it("shows the weekdays and times of a saved schedule in My schedule mode", () => {
    renderCard({ ...sydneyCard, schedule: eveningSchedule }, "my_schedule");

    expect(harness.host.textContent).toContain("Tue, Thu · 6:00 pm – 8:00 pm");
  });

  it("offers schedule editing only in My schedule mode", () => {
    renderCard({ ...sydneyCard, schedule: eveningSchedule }, "now");
    expect(
      document.body.querySelector('[aria-label="Edit schedule"]'),
    ).toBeNull();

    renderCard({ ...sydneyCard, schedule: eveningSchedule }, "my_schedule");
    const editButton = document.body.querySelector(
      '[aria-label="Edit schedule"]',
    ) as HTMLButtonElement;
    expect(editButton).not.toBeNull();

    act(() => editButton.click());
    expect(document.body.textContent).toContain(
      "Editing schedule for Soccer · Sydney",
    );
  });

  it("marks an end time of midnight as the next day", () => {
    renderCard(
      {
        ...sydneyCard,
        schedule: { weekdays: [6], startMinutes: 1260, endMinutes: 1440 },
      },
      "my_schedule",
    );

    expect(harness.host.textContent).toContain(
      "Sat · 9:00 pm – 12:00 am (next day)",
    );
  });

  it("translates the schedule when the language changes", () => {
    renderCard({ ...sydneyCard, schedule: eveningSchedule }, "my_schedule");

    act(() => {
      void harness.i18n.changeLanguage("zh-CN");
    });

    expect(harness.host.textContent).toContain("周二、周四 · 18:00 – 20:00");
  });

  it("shows no schedule line outside My schedule", () => {
    renderCard(sydneyCard);

    expect(harness.host.textContent).not.toMatch(/\d:\d{2}\s*(am|pm)\s*–/i);
  });
});
