import { describe, expect, it } from "vitest";
import { ENVIRONMENTAL_METRICS } from "@/domain/environmental";

describe("ENVIRONMENTAL_METRICS", () => {
  it("registers the five current-hour environmental fields", () => {
    expect(ENVIRONMENTAL_METRICS.map((metric) => metric.key)).toEqual([
      "airTemperature",
      "windSpeed",
      "relativeHumidity",
      "meanRadiantTemperature",
      "directNormalIrradiance",
    ]);
  });
});
