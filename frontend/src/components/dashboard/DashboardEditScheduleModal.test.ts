// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardEditScheduleModal } from "@/components/dashboard/DashboardEditScheduleModal";
import { createDashboardComponentHost } from "@/test/dashboardComponentHarness";

let harness: Awaited<ReturnType<typeof createDashboardComponentHost>>;

function buttonNamed(name: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) {
    throw new Error(`Button "${name}" was not found`);
  }
  return button;
}

function weekdayCheckbox(label: string): HTMLInputElement {
  const labelElement = Array.from(document.body.querySelectorAll("label")).find(
    (candidate) => candidate.textContent === label,
  );
  if (!labelElement) {
    throw new Error(`Weekday "${label}" was not found`);
  }
  return document.getElementById(labelElement.htmlFor) as HTMLInputElement;
}

beforeEach(async () => {
  harness = await createDashboardComponentHost();
});

afterEach(() => {
  harness.cleanup();
});

describe("DashboardEditScheduleModal", () => {
  it("prefills and saves the edited weekly schedule", () => {
    const onClose = vi.fn();
    const onSave = vi.fn(() => ({ ok: true }) as const);

    harness.render(
      createElement(DashboardEditScheduleModal, {
        schedule: {
          weekdays: [2, 4],
          startMinutes: 1080,
          endMinutes: 1200,
        },
        cardTitle: "Soccer · Sydney",
        onClose,
        onSave,
      }),
      { withRouter: false },
    );

    expect(document.body.textContent).toContain(
      "Editing schedule for Soccer · Sydney",
    );
    expect(weekdayCheckbox("Tue").checked).toBe(true);
    expect(weekdayCheckbox("Thu").checked).toBe(true);
    expect(
      document.body.querySelector<HTMLInputElement>(
        'input[aria-label="Start time"]',
      )?.value,
    ).toBe("6:00 pm");

    act(() => weekdayCheckbox("Tue").click());
    act(() => buttonNamed("Save changes").click());

    expect(onSave).toHaveBeenCalledWith({
      weekdays: [4],
      startMinutes: 1080,
      endMinutes: 1200,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the modal open and explains a duplicate schedule", () => {
    const onClose = vi.fn();
    const onSave = vi.fn(() => ({ ok: false, reason: "duplicate" }) as const);

    harness.render(
      createElement(DashboardEditScheduleModal, {
        schedule: {
          weekdays: [2],
          startMinutes: 1080,
          endMinutes: 1200,
        },
        cardTitle: "Soccer · Sydney",
        onClose,
        onSave,
      }),
      { withRouter: false },
    );

    act(() => buttonNamed("Save changes").click());

    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(
      "Another card already uses this location, sport, and schedule.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
