// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyWindowPreview } from "@/components/dashboard/WeeklyWindowPreview";
import type { WeeklyPreviewSource } from "@/domain/weeklyWindowPreview";
import { sydneyCard, sydneyForecast } from "@/test/weeklyWindowFixtures";
import en from "@/i18n/locales/en/translation.json";
import zh from "@/i18n/locales/zh-CN/translation.json";

let root: Root;
let host: HTMLDivElement;
let language: ReturnType<typeof createInstance>;
let source: WeeklyPreviewSource;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date("2026-09-15T07:59:45Z"));
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
  source = { status: "ok", result: sydneyForecast() };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function render() {
  act(() =>
    root.render(
      createElement(
        MemoryRouter,
        null,
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
            createElement(WeeklyWindowPreview, {
              cards: [sydneyCard],
              getSource: () => source,
            }),
          ),
        ),
      ),
    ),
  );
}

function choose(label: string, option: string) {
  const labelElement = Array.from(host.querySelectorAll("label")).find(
    (item) => item.textContent === label,
  );
  expect(labelElement, `Missing field ${label}`).toBeDefined();
  const input = document.getElementById(labelElement!.htmlFor)!;
  act(() => input.click());
  const listbox = document.getElementById(
    input.getAttribute("aria-controls")!,
  )!;
  expect(listbox, `Missing options for ${label}`).not.toBeNull();
  const item = Array.from(
    listbox.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((element) => element.textContent === option);
  expect(item, `Missing option ${option}`).toBeDefined();
  act(() => item!.click());
}

describe("weekly window component interactions", () => {
  it("renders the real Mantine controls, risk samples and location/sport Home link", () => {
    render();
    expect(host.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(host.querySelector("tbody")?.textContent).toContain("High");
    const home = host.querySelector("a")!;
    const params = new URL(home.href).searchParams;
    expect(params.get("sport")).toBe("SOCCER");
    expect(params.get("loc")).toBe(sydneyCard.displayLabel);
  });

  it("replaces risk results with validation after an invalid end selection", () => {
    render();
    choose("End time", "5:00 pm");
    expect(host.textContent).toContain(en.weeklyPreview.status.invalid_window);
    expect(host.querySelector("table")).toBeNull();
    choose("End time", "8:00 pm");
    expect(host.querySelectorAll("tbody tr")).toHaveLength(3);
  });

  it("labels next-day midnight in both the summary and the table, and updates on language change", () => {
    render();
    choose("End time", "Midnight (next day)");
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "12:00 am (next day)",
    );
    expect(host.querySelector("tbody tr:last-child")?.textContent).toContain(
      "12:00 am (next day)",
    );
    act(() => {
      void language.changeLanguage("zh-CN");
    });
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      "0:00（次日）",
    );
    expect(host.querySelector("tbody tr:last-child")?.textContent).toContain(
      "0:00（次日）",
    );
    expect(host.textContent).toContain("每周时间窗口预览");
  });

  it("rolls immediately after the start boundary without waiting a full minute", () => {
    render();
    expect(host.textContent).toContain("15 Sept 2026");
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(host.textContent).toContain("15 Sept 2026");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(host.textContent).toContain("22 Sept 2026");
    expect(host.textContent).toContain(
      en.weeklyPreview.status.incomplete_forecast,
    );
    expect(host.querySelector("table")).toBeNull();
  });

  it.each(["focus", "visibilitychange"])(
    "refreshes a suspended clock on %s",
    (event) => {
      render();
      vi.setSystemTime(new Date("2026-09-15T08:00:10Z"));
      act(() => {
        (event === "focus" ? window : document).dispatchEvent(new Event(event));
      });
      expect(host.textContent).toContain("22 Sept 2026");
      expect(host.querySelector("table")).toBeNull();
    },
  );

  it("reads current time when the user changes a selection after the start", () => {
    render();
    vi.setSystemTime(new Date("2026-09-15T08:00:10Z"));
    choose("End time", "9:00 pm");
    expect(host.textContent).toContain("22 Sept 2026");
    expect(host.querySelector("table")).toBeNull();
  });

  it.each(["loading", "unavailable"] as const)(
    "removes previous risks when data becomes %s",
    (status) => {
      render();
      source = { status };
      render();
      expect(host.textContent).toContain(en.weeklyPreview.status[status]);
      expect(host.querySelector("table")).toBeNull();
    },
  );
});
