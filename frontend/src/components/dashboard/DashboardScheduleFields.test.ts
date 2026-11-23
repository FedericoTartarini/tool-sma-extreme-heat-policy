// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardScheduleFields } from "@/components/dashboard/DashboardScheduleFields";
import en from "@/i18n/locales/en/translation.json";
import zh from "@/i18n/locales/zh-CN/translation.json";

let root: Root;
let host: HTMLDivElement;
let language: ReturnType<typeof createInstance>;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    })),
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  language = createInstance();
  await language.use(initReactI18next).init({
    initImmediate: false,
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en }, "zh-CN": { translation: zh } },
    interpolation: { escapeValue: false },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function render(overrides: Record<string, unknown> = {}) {
  const props = {
    weekdays: [],
    startMinutes: null,
    endMinutes: null,
    onWeekdaysChange: vi.fn(),
    onStartMinutesChange: vi.fn(),
    onEndMinutesChange: vi.fn(),
    labelWidth: 72,
    ...overrides,
  };
  act(() =>
    root.render(
      createElement(
        I18nextProvider,
        { i18n: language },
        createElement(
          MantineProvider,
          {
            env: "test",
            forceColorScheme: "light",
            withCssVariables: false,
            withGlobalClasses: false,
          },
          createElement(DashboardScheduleFields, props),
        ),
      ),
    ),
  );
  return props;
}

function weekdayCheckbox(label: string): HTMLInputElement {
  const labelElement = Array.from(host.querySelectorAll("label")).find(
    (item) => item.textContent === label,
  );
  expect(labelElement, `Missing weekday ${label}`).toBeDefined();
  return document.getElementById(labelElement!.htmlFor) as HTMLInputElement;
}

function choose(fieldLabel: string, option: string) {
  const input = host.querySelector<HTMLInputElement>(
    `input[aria-label="${fieldLabel}"]`,
  );
  expect(input, `Missing field ${fieldLabel}`).not.toBeNull();
  act(() => input!.click());
  const listbox = document.getElementById(
    input!.getAttribute("aria-controls")!,
  )!;
  const item = Array.from(
    listbox.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((element) => element.textContent === option);
  expect(item, `Missing option ${option}`).toBeDefined();
  act(() => item!.click());
}

describe("dashboard schedule fields", () => {
  it("shows every weekday from Sunday and both time fields", () => {
    render();

    const weekdays = host.querySelector('[role="group"][aria-label="Days"]');
    expect(
      Array.from(weekdays!.querySelectorAll("label")).map(
        (label) => label.textContent,
      ),
    ).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(host.querySelector('input[aria-label="Start time"]')).not.toBeNull();
    expect(host.querySelector('input[aria-label="End time"]')).not.toBeNull();
  });

  it("passes the chosen weekdays in order", () => {
    const { onWeekdaysChange } = render({ weekdays: [4] });

    act(() => weekdayCheckbox("Tue").click());

    expect(onWeekdaysChange).toHaveBeenCalledWith([2, 4]);
  });

  it("passes the chosen start time in minutes", () => {
    const { onStartMinutesChange } = render();

    choose("Start time", "6:00 pm");

    expect(onStartMinutesChange).toHaveBeenCalledWith(1080);
  });

  it("offers midnight as the last end time", () => {
    const { onEndMinutesChange } = render();

    choose("End time", "Midnight (next day)");

    expect(onEndMinutesChange).toHaveBeenCalledWith(1440);
  });

  it("does not render clear buttons in the time selectors", () => {
    render({ startMinutes: 540, endMinutes: 660 });

    expect(host.querySelectorAll("button")).toHaveLength(0);
  });

  it("disables every field when disabled", () => {
    render({ disabled: true });

    expect(weekdayCheckbox("Mon").disabled).toBe(true);
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Start time"]')
        ?.disabled,
    ).toBe(true);
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="End time"]')
        ?.disabled,
    ).toBe(true);
  });

  it("explains why an end time not after the start is rejected", () => {
    render({ weekdays: [1], startMinutes: 660, endMinutes: 540 });

    expect(host.textContent).toContain(
      "Choose an end time later than the start.",
    );
  });

  it("keeps the required-fields hint for a valid schedule", () => {
    render({ weekdays: [1], startMinutes: 540, endMinutes: 660 });

    expect(host.textContent).toContain("All schedule fields are required.");
    expect(host.textContent).not.toContain(
      "Choose an end time later than the start.",
    );
  });

  it("labels weekdays and times in Chinese", () => {
    act(() => {
      void language.changeLanguage("zh-CN");
    });
    render();

    expect(weekdayCheckbox("周二")).not.toBeNull();
    choose("结束时间", "次日零点");
  });
});
