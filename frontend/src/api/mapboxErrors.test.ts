import { describe, expect, it } from "vitest";
import {
  createMapboxHttpStatusError,
  createMapboxInvalidResponseError,
  toMapboxApiError,
} from "@/api/mapboxErrors";

describe("Mapbox API errors", () => {
  it("preserves endpoint and status for HTTP errors", () => {
    expect(createMapboxHttpStatusError("suggest", 429)).toMatchObject({
      endpoint: "suggest",
      kind: "http_status",
      status: 429,
    });
  });

  it("preserves endpoint for invalid response errors", () => {
    expect(
      createMapboxInvalidResponseError("retrieve", "bad payload"),
    ).toMatchObject({
      endpoint: "retrieve",
      kind: "invalid_response",
    });
  });

  it("classifies aborts separately from network failures", () => {
    expect(
      toMapboxApiError("retrieve", new DOMException("Aborted", "AbortError")),
    ).toMatchObject({
      endpoint: "retrieve",
      kind: "abort",
    });
  });

  it("classifies unknown thrown values as network failures", () => {
    expect(toMapboxApiError("suggest", new Error("offline"))).toMatchObject({
      endpoint: "suggest",
      kind: "network",
    });
  });
});
