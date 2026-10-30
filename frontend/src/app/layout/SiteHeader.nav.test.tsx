// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/app/layout/SiteHeader";

vi.mock("react-i18next", async () => {
  const { layoutI18nMock } = await import("@/test/layoutTestUtils");
  return layoutI18nMock;
});

vi.mock("@/hooks/useIsMobileViewport", () => ({
  useIsMobileViewport: () => false,
}));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
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
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("SiteHeader navigation", () => {
  it("links to the dashboard from the navigation drawer", () => {
    act(() =>
      root.render(
        <MantineProvider
          env="test"
          forceColorScheme="light"
          withCssVariables={false}
          withGlobalClasses={false}
        >
          <MemoryRouter initialEntries={["/"]}>
            <SiteHeader />
          </MemoryRouter>
        </MantineProvider>,
      ),
    );

    const toggle = document.querySelector<HTMLButtonElement>(
      'button[aria-label="nav.toggleAriaLabel"]',
    );
    expect(toggle, "Missing navigation toggle").not.toBeNull();
    act(() => toggle!.click());

    const dashboardLink = Array.from(document.querySelectorAll("a")).find(
      (link) => link.textContent === "nav.dashboard",
    );
    expect(dashboardLink, "Missing Dashboard menu item").toBeDefined();
    expect(dashboardLink!.getAttribute("href")).toBe("/dashboard");
  });
});
