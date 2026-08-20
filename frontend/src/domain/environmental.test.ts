import { describe, expect, it } from "vitest";
import { ENVIRONMENTAL_METRICS } from "@/domain/environmental";

describe("ENVIRONMENTAL_METRICS", () => {
  it("registers the five backend forecast input fields in camelCase", () => {
    expect(ENVIRONMENTAL_METRICS.map((metric) => metric.field)).toEqual([
      "airTemperatureC",
      "relativeHumidityPct",
      "windSpeed10mMs",
      "meanRadiantTemperatureC",
      "directNormalIrradianceWm2",
    ]);
  });
});
