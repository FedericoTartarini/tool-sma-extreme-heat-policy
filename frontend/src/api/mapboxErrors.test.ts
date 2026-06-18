import { describe, expect, it } from "vitest";
import {
  createMapboxHttpStatusError,
  createMapboxInvalidResponseError,
  toMapboxApiError,
  toMapboxResponseJsonError,
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

  it("classifies response JSON syntax errors as invalid responses", () => {
    const syntaxError = new SyntaxError("bad json");

    expect(
      toMapboxResponseJsonError("suggest", syntaxError, "not valid JSON"),
    ).toMatchObject({
      endpoint: "suggest",
      kind: "invalid_response",
      cause: syntaxError,
    });
  });

  it("preserves abort classification for response JSON failures", () => {
    expect(
      toMapboxResponseJsonError(
        "retrieve",
        new DOMException("Aborted", "AbortError"),
        "not valid JSON",
      ),
    ).toMatchObject({
      endpoint: "retrieve",
      kind: "abort",
    });
  });

  it("classifies non-syntax response JSON failures as network failures", () => {
    expect(
      toMapboxResponseJsonError("suggest", new Error("stream failed"), "read"),
    ).toMatchObject({
      endpoint: "suggest",
      kind: "network",
    });
  });
});
