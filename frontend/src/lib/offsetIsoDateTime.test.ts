import { describe, expect, it } from "vitest";
import { parseOffsetIsoDateTime } from "@/lib/offsetIsoDateTime";

describe("parseOffsetIsoDateTime", () => {
  it("returns the local date key and time label for valid offset ISO datetimes", () => {
    expect(parseOffsetIsoDateTime("2026-03-10T00:00:00+08:45")).toEqual({
      dateKey: "2026-03-10",
      timeLabel: "00:00",
    });
  });

  it("rejects values without an explicit numeric offset", () => {
    expect(parseOffsetIsoDateTime("2026-03-10T00:00:00Z")).toBeNull();
    expect(parseOffsetIsoDateTime("not-a-local-time")).toBeNull();
  });
});
