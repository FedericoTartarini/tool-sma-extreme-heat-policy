import { describe, expect, it } from "vitest";
import { createLatestAbortableRequestController } from "@/lib/latestAbortableRequest";

describe("createLatestAbortableRequestController", () => {
  it("aborts the previous request and marks it stale when a newer request starts", () => {
    const controller = createLatestAbortableRequestController();

    const first = controller.start();
    const second = controller.start();

    expect(first.signal.aborted).toBe(true);
    expect(first.isCurrent()).toBe(false);
    expect(second.signal.aborted).toBe(false);
    expect(second.isCurrent()).toBe(true);
  });

  it("marks a request stale when user input cancels the active retrieve", () => {
    const controller = createLatestAbortableRequestController();

    const request = controller.start();
    controller.cancel();

    expect(request.signal.aborted).toBe(true);
    expect(request.isCurrent()).toBe(false);
  });

  it("only lets the current request clear itself on finish", () => {
    const controller = createLatestAbortableRequestController();

    const first = controller.start();
    const second = controller.start();

    first.finish();
    expect(second.isCurrent()).toBe(true);

    second.finish();
    expect(second.isCurrent()).toBe(false);
  });
});
