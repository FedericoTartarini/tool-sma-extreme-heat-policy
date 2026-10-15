// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCardActions } from "@/components/dashboard/DashboardCardActions";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";

const ACTION_PROPS = {
  index: 0,
  totalCount: 2,
  onRemove: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  onEditSchedule: vi.fn(),
};

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

function getDeleteTrigger(): HTMLElement {
  const trigger = document.body.querySelector(
    '[aria-label="Delete"]',
  ) as HTMLElement | null;
  if (!trigger) {
    throw new Error("Delete control was not found");
  }
  return trigger;
}

function getButtonByName(name: string): HTMLButtonElement {
  const buttons = Array.from(document.body.querySelectorAll("button"));
  const match = buttons.find((button) => button.textContent?.trim() === name);
  if (!match) {
    throw new Error(`Button "${name}" was not found`);
  }
  return match;
}

beforeEach(async () => {
  harness = await createDashboardComponentHost();
  ACTION_PROPS.onRemove.mockReset();
  ACTION_PROPS.onEditSchedule.mockReset();
});

describe("DashboardCardActions schedule editing", () => {
  it("shows the edit action only for editable schedule cards", () => {
    harness.render(
      createElement(DashboardCardActions, {
        ...ACTION_PROPS,
        canEditSchedule: true,
      }),
      { withRouter: false },
    );

    const editButton = document.body.querySelector(
      '[aria-label="Edit schedule"]',
    ) as HTMLButtonElement;
    expect(editButton).not.toBeNull();

    act(() => editButton.click());
    expect(ACTION_PROPS.onEditSchedule).toHaveBeenCalledTimes(1);

    harness.render(createElement(DashboardCardActions, ACTION_PROPS), {
      withRouter: false,
    });
    expect(
      document.body.querySelector('[aria-label="Edit schedule"]'),
    ).toBeNull();
  });
});

afterEach(() => {
  harness.cleanup();
  vi.clearAllMocks();
});

describe("DashboardCardActions delete confirmation", () => {
  it("opens a confirmation modal and only removes the card after confirm", () => {
    harness.render(createElement(DashboardCardActions, ACTION_PROPS), {
      withRouter: false,
    });

    act(() => {
      getDeleteTrigger().click();
    });

    expect(document.body.textContent).toContain("Remove card?");
    expect(document.body.textContent).toContain(
      "This card will be removed from your dashboard. You can add it again later.",
    );
    expect(ACTION_PROPS.onRemove).not.toHaveBeenCalled();

    act(() => {
      getButtonByName("Cancel").click();
    });

    expect(document.body.textContent).not.toContain(
      "This card will be removed from your dashboard. You can add it again later.",
    );
    expect(ACTION_PROPS.onRemove).not.toHaveBeenCalled();

    act(() => {
      getDeleteTrigger().click();
    });

    act(() => {
      getButtonByName("Remove card").click();
    });

    expect(ACTION_PROPS.onRemove).toHaveBeenCalledTimes(1);
  });
});
