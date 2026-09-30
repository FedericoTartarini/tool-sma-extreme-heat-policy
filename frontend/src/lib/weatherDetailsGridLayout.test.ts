import { describe, expect, it } from "vitest";
import {
  WEATHER_DETAILS_DESKTOP_ROWS,
  WEATHER_DETAILS_MOBILE_PAIRS,
} from "@/config/weatherDetailsGridConfig";
import {
  listAvailableWeatherGroups,
  WEATHER_DETAILS_GROUP_DEFINITIONS,
} from "@/domain/weatherDetailsRegistry";
import type { DayWeatherDetails } from "@/domain/weatherSummary";
import {
  buildFlatWeatherDetailsDesktopLayout,
  buildFlatWeatherDetailsSections,
} from "@/lib/weatherDetailsGridLayout";

const BASE_DETAILS: DayWeatherDetails = {
  maxTempC: 29.6,
  minTempC: 16.9,
  humidityAtMaxPct: 22,
  humidityAtMinPct: 49,
  avgWindSpeedMs: 2.8,
  maxTempTimeLocal: "14:00",
  minTempTimeLocal: "08:00",
};

describe("weather details grid config", () => {
  it("assigns every registered group a desktop placement", () => {
    const placedIds = WEATHER_DETAILS_DESKTOP_ROWS.flatMap((row) => [
      ...(row.left ? [row.left] : []),
      ...row.right,
    ]);

    expect(placedIds).toHaveLength(WEATHER_DETAILS_GROUP_DEFINITIONS.length);
    expect(new Set(placedIds).size).toBe(placedIds.length);
    expect([...placedIds].sort()).toEqual(
      WEATHER_DETAILS_GROUP_DEFINITIONS.map((group) => group.id).sort(),
    );
  });

  it("keeps mobile pair groups adjacent in registry order", () => {
    const registryIds = WEATHER_DETAILS_GROUP_DEFINITIONS.map(
      (group) => group.id,
    );

    for (const [left, right] of WEATHER_DETAILS_MOBILE_PAIRS) {
      const leftIndex = registryIds.indexOf(left);
      const rightIndex = registryIds.indexOf(right);

      expect(leftIndex).toBeGreaterThanOrEqual(0);
      expect(rightIndex).toBe(leftIndex + 1);
    }
  });
});

describe("buildFlatWeatherDetailsSections", () => {
  it("pairs uv and wind into one flat-panel row when both are available", () => {
    const groups = listAvailableWeatherGroups({
      ...BASE_DETAILS,
      uvIndexMax: 7.4,
    });

    expect(buildFlatWeatherDetailsSections(groups)).toEqual([
      { kind: "single", group: groups[0] },
      {
        kind: "pair",
        groups: [groups[1], groups[2]],
      },
    ]);
    expect(buildFlatWeatherDetailsSections(groups)[1]).toMatchObject({
      groups: [{ id: "uv" }, { id: "wind" }],
    });
  });
});

describe("buildFlatWeatherDetailsDesktopLayout", () => {
  it("places temperature left and UV/wind right on the first row", () => {
    const groups = listAvailableWeatherGroups({
      ...BASE_DETAILS,
      uvIndexMax: 7.4,
      cumulativeRainfallMm: 0,
      precipProbMaxPct: 0,
      sunriseLocal: "07:13",
      sunsetLocal: "18:56",
    });
    const layout = buildFlatWeatherDetailsDesktopLayout(groups);

    expect(layout.topRow?.left?.id).toBe("temperatureHumidity");
    expect(layout.topRow?.right.map((group) => group.id)).toEqual([
      "uv",
      "wind",
    ]);
    expect(layout.bottomRow?.left?.id).toBe("precipitation");
    expect(layout.bottomRow?.right.map((group) => group.id)).toEqual([
      "daylight",
    ]);
  });

  it("omits empty desktop halves when optional groups are missing", () => {
    const layout = buildFlatWeatherDetailsDesktopLayout(
      listAvailableWeatherGroups(BASE_DETAILS),
    );

    expect(layout.topRow?.left?.id).toBe("temperatureHumidity");
    expect(layout.topRow?.right.map((group) => group.id)).toEqual(["wind"]);
    expect(layout.bottomRow).toBeNull();
  });
});
