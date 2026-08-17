import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useHomeUiStore } from "@/store/homeUiStore";

describe("homeUiStore", () => {
  beforeEach(() => {
    useHomeUiStore.setState({ showRawData: false });
  });

  afterEach(() => {
    useHomeUiStore.setState({ showRawData: false });
  });

  it("starts with showRawData off", () => {
    expect(useHomeUiStore.getState().showRawData).toBe(false);
  });

  it("updates shared state when toggled", () => {
    useHomeUiStore.getState().setShowRawData(true);

    expect(useHomeUiStore.getState().showRawData).toBe(true);
  });
});
