// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardMainPanel } from "@/components/dashboard/DashboardMainPanel";
import en from "@/i18n/locales/en/translation.json";
import zh from "@/i18n/locales/zh-CN/translation.json";

const addForm = vi.hoisted(() => ({ result: {} as Record<string, unknown> }));

vi.mock("@/hooks/useDashboardLocationAdd", () => ({
  useDashboardLocationAdd: () => addForm.result,
}));

let root: Root;
let host: HTMLDivElement;
let language: ReturnType<typeof createInstance>;

function setAddForm(overrides: Record<string, unknown> = {}) {
  addForm.result = {
    locationSearchInput: "",
    locationSuggestions: [],
    isSuggestLoading: false,
    isResolvingLocation: false,
    isShowingCommittedDraftLocation: false,
    canAddMoreCards: true,
    canSubmitAdd: true,
    addErrorReason: null,
    draftWeekdays: [],
    draftStartMinutes: null,
    draftEndMinutes: null,
    onDraftWeekdaysChange: vi.fn(),
    onDraftStartMinutesChange: vi.fn(),
    onDraftEndMinutesChange: vi.fn(),
    onLocationSearchInputChange: vi.fn(),
    onLocationOptionSubmit: vi.fn(),
    onAddCardClick: vi.fn(),
    ...overrides,
  };
}

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
  setAddForm();
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

function render() {
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
          createElement(MemoryRouter, null, createElement(DashboardMainPanel)),
        ),
      ),
    ),
  );
}

function openAddModal() {
  const openButton = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Add card",
  );
  expect(openButton, "Missing Add card button").toBeDefined();
  act(() => openButton!.click());
}

function weekdayCheckbox(label: string): HTMLInputElement {
  const labelElement = Array.from(document.querySelectorAll("label")).find(
    (item) => item.textContent === label,
  );
  expect(labelElement, `Missing weekday ${label}`).toBeDefined();
  return document.getElementById(labelElement!.htmlFor) as HTMLInputElement;
}

describe("dashboard add panel schedule fields", () => {
  it("links to detailed recommendations in the header summary", () => {
    render();

    const recommendationsLink = document.querySelector(
      'a[href="/detailed-recommendations"]',
    );
    expect(recommendationsLink).not.toBeNull();
    expect(recommendationsLink?.textContent).toBe("detailed recommendations");
  });

  it("keeps the add form inside a modal until opened", () => {
    render();

    expect(
      document.querySelector('[role="group"][aria-label="Days"]'),
    ).toBeNull();
    expect(
      Array.from(document.querySelectorAll("button")).some(
        (button) => button.textContent === "Add card",
      ),
    ).toBe(true);

    openAddModal();

    expect(
      document.querySelector('[role="group"][aria-label="Days"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('input[aria-label="Start time"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('input[aria-label="End time"]'),
    ).not.toBeNull();
    expect(document.body.textContent).toContain("Add a dashboard card");
    expect(document.body.textContent).toContain(
      "Choose at least one day and a time range ending later that day or at midnight. All schedule fields are required.",
    );
  });

  it("sends the chosen weekdays to the add form", () => {
    const onDraftWeekdaysChange = vi.fn();
    setAddForm({ draftWeekdays: [4], onDraftWeekdaysChange });
    render();
    openAddModal();

    act(() => weekdayCheckbox("Tue").click());

    expect(onDraftWeekdaysChange).toHaveBeenCalledWith([2, 4]);
  });

  it("disables the open button when no more cards can be added", () => {
    setAddForm({ canAddMoreCards: false });
    render();

    const openButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Add card",
    );
    expect(openButton?.disabled).toBe(true);
  });

  it("disables the schedule fields when no more cards can be added", () => {
    setAddForm({ canAddMoreCards: false });
    render();
    // Modal stays closed when max reached; open path is blocked by the button.
    expect(
      document.querySelector('[role="group"][aria-label="Days"]'),
    ).toBeNull();
  });

  it("disables the add button while the schedule is incomplete", () => {
    setAddForm({ draftWeekdays: [2], canSubmitAdd: false });
    render();
    openAddModal();

    const addButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Add to dashboard",
    );
    expect(addButton?.disabled).toBe(true);
  });
});
