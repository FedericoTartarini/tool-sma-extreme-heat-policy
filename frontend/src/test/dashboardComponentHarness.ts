import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { createInstance, type i18n as I18nInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import en from "@/i18n/locales/en/translation.json";
import zh from "@/i18n/locales/zh-CN/translation.json";

export interface DashboardComponentHost {
  root: Root;
  host: HTMLDivElement;
  i18n: I18nInstance;
  render: (element: ReactElement, options?: { withRouter?: boolean }) => void;
  cleanup: () => void;
}

export async function createDashboardComponentHost(): Promise<DashboardComponentHost> {
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

  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    initImmediate: false,
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en }, "zh-CN": { translation: zh } },
    interpolation: { escapeValue: false },
  });

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  return {
    root,
    host,
    i18n,
    render(element, options) {
      const wrapped = createElement(
        I18nextProvider,
        { i18n },
        createElement(
          MantineProvider,
          {
            env: "test",
            forceColorScheme: "light",
            withCssVariables: false,
            withGlobalClasses: false,
          },
          options?.withRouter === false
            ? element
            : createElement(MemoryRouter, null, element),
        ),
      );

      act(() => {
        root.render(wrapped);
      });
    },
    cleanup() {
      act(() => {
        root.unmount();
      });
      host.remove();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    },
  };
}
