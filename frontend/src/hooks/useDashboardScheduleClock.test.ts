// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardScheduleClock } from "@/hooks/useDashboardScheduleClock";

let host: HTMLDivElement;
let root: Root;

function Probe() {
  return useDashboardScheduleClock().toISOString();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("dashboard schedule clock", () => {
  it("refreshes just after the next minute boundary", () => {
    vi.setSystemTime("2026-09-15T08:00:59.900Z");
    act(() => root.render(createElement(Probe)));

    expect(host.textContent).toBe("2026-09-15T08:00:59.900Z");

    act(() => {
      vi.advanceTimersByTime(101);
    });

    expect(host.textContent).toBe("2026-09-15T08:01:00.001Z");
  });

  it("refreshes when the window regains focus", () => {
    vi.setSystemTime("2026-09-15T08:00:00.000Z");
    act(() => root.render(createElement(Probe)));
    vi.setSystemTime("2026-09-15T10:30:00.000Z");

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(host.textContent).toBe("2026-09-15T10:30:00.000Z");
  });
});
