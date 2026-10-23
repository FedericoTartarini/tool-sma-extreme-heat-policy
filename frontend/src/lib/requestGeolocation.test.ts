import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestGeolocation } from "@/lib/requestGeolocation";

describe("requestGeolocation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function start(controller = new AbortController()) {
    const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onTimeout = vi.fn();
    requestGeolocation({
      geolocation: {
        getCurrentPosition,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
      signal: controller.signal,
      onSuccess,
      onError,
      onTimeout,
    });
    return { getCurrentPosition, onSuccess, onError, onTimeout, controller };
  }

  const position = {
    coords: { latitude: -33.89, longitude: 151.2 },
  } as GeolocationPosition;
  const error = { code: 1 } as GeolocationPositionError;

  it("times out an unanswered permission prompt and ignores late callbacks", () => {
    const flow = start();
    vi.advanceTimersByTime(14_999);
    expect(flow.onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(flow.onTimeout).toHaveBeenCalledTimes(1);
    flow.getCurrentPosition.mock.calls[0]![0](position);
    flow.getCurrentPosition.mock.calls[0]![1]!(error);
    expect(flow.onSuccess).not.toHaveBeenCalled();
    expect(flow.onError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the watchdog on success, allowing a slower reverse lookup", () => {
    const flow = start();
    flow.getCurrentPosition.mock.calls[0]![0](position);
    vi.advanceTimersByTime(30_000);
    expect(flow.onSuccess).toHaveBeenCalledExactlyOnceWith(position);
    expect(flow.onTimeout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the watchdog on a browser error", () => {
    const flow = start();
    flow.getCurrentPosition.mock.calls[0]![1]!(error);
    vi.advanceTimersByTime(30_000);
    expect(flow.onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(flow.onTimeout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up on cancellation and suppresses late callbacks", () => {
    const flow = start();
    flow.controller.abort();
    expect(vi.getTimerCount()).toBe(0);
    flow.getCurrentPosition.mock.calls[0]![0](position);
    flow.getCurrentPosition.mock.calls[0]![1]!(error);
    vi.advanceTimersByTime(30_000);
    expect(flow.onSuccess).not.toHaveBeenCalled();
    expect(flow.onError).not.toHaveBeenCalled();
    expect(flow.onTimeout).not.toHaveBeenCalled();
  });

  it("allows a new request after timeout without accepting the old result", () => {
    const first = start();
    vi.advanceTimersByTime(15_000);
    const second = start();
    first.getCurrentPosition.mock.calls[0]![0](position);
    second.getCurrentPosition.mock.calls[0]![0](position);
    expect(first.onTimeout).toHaveBeenCalledOnce();
    expect(first.onSuccess).not.toHaveBeenCalled();
    expect(second.onSuccess).toHaveBeenCalledExactlyOnceWith(position);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not start an already cancelled request", () => {
    const controller = new AbortController();
    controller.abort();
    const flow = start(controller);
    expect(flow.getCurrentPosition).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
