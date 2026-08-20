import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useHomeUiStore } from "@/store/homeUiStore";

describe("homeUiStore", () => {
  beforeEach(() => {
    useHomeUiStore.setState({ showWeatherDetails: false });
  });

  afterEach(() => {
    useHomeUiStore.setState({ showWeatherDetails: false });
  });

  it("starts with showWeatherDetails off", () => {
    expect(useHomeUiStore.getState().showWeatherDetails).toBe(false);
  });

  it("updates shared state when toggled", () => {
    useHomeUiStore.getState().setShowWeatherDetails(true);

    expect(useHomeUiStore.getState().showWeatherDetails).toBe(true);
  });
});
