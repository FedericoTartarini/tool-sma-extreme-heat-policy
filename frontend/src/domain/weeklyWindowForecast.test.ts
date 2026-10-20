import { describe, expect, it } from "vitest";
import type { ForecastApiPoint } from "@/api/heatRisk";
import {
  selectWeeklyWindowForecast,
  summarizeWeeklyWindowRisk,
} from "@/domain/weeklyWindowForecast";
import {
  getNextWeeklyWindow,
  type ScheduledWindow,
} from "@/domain/weeklyWindow";

const WINDOW: ScheduledWindow = {
  localDate: "2026-09-15",
  timeZone: "Australia/Sydney",
  startUtc: "2026-09-15T08:00:00Z",
  endUtc: "2026-09-15T10:00:00Z",
};

function point(hour: number, score = 1.2): ForecastApiPoint {
  const instant = Date.UTC(2026, 8, 15, hour);
  return {
    time_utc: new Date(instant).toISOString(),
    time_local: `${new Date(instant + 10 * 3_600_000).toISOString().slice(0, 19)}+10:00`,
    inputs: {
      tdb: 25,
      tr: 30,
      rh: 50,
      v_z1: 2,
      sol_radiation_dir: 200,
    },
    heat_risk: {
      risk_level_interpolated: score,
      t_medium: 30,
      t_high: 35,
      t_extreme: 40,
      recommendation: "Hydrate",
    },
  };
}

describe("weekly window forecast selection", () => {
  it.each(["invalid", "2026-09-15T20:00:00+10:00"])(
    "rejects invalid or inconsistent local time: %s",
    (time_local) => {
      expect(
        selectWeeklyWindowForecast(
          [point(8), { ...point(9), time_local }, point(10)],
          WINDOW,
        ),
      ).toEqual({ status: "invalid_forecast" });
    },
  );
  it("selects only the target window, including endpoints, without changing input order", () => {
    const forecast = [point(10), point(7), point(9), point(8), point(11, 4)];
    const original = [...forecast];
    expect(selectWeeklyWindowForecast(forecast, WINDOW)).toEqual({
      status: "ok",
      points: [point(8), point(9), point(10)],
    });
    expect(forecast).toEqual(original);
  });

  it.each([
    { forecast: [] },
    { forecast: [point(7), point(8)] },
    { forecast: [point(9), point(10)] },
    { forecast: [point(8), point(10)] },
  ])(
    "does not report success for an uncovered or incomplete window: %j",
    ({ forecast }) => {
      expect(selectWeeklyWindowForecast(forecast, WINDOW).status).toBe(
        "incomplete_forecast",
      );
    },
  );

  it("keeps minute boundaries without inventing minute-level weather data", () => {
    expect(
      selectWeeklyWindowForecast([point(8), point(9), point(10)], {
        ...WINDOW,
        startUtc: "2026-09-15T08:30:00Z",
        endUtc: "2026-09-15T09:30:00Z",
      }),
    ).toEqual({ status: "ok", points: [point(9)] });
  });

  it("returns incomplete when a short window contains no actual forecast sample", () => {
    expect(
      selectWeeklyWindowForecast([point(8), point(9)], {
        ...WINDOW,
        startUtc: "2026-09-15T08:15:00Z",
        endUtc: "2026-09-15T08:45:00Z",
      }),
    ).toEqual({ status: "incomplete_forecast" });
  });

  it("rejects non-finite risk instead of treating it as low risk", () => {
    expect(
      selectWeeklyWindowForecast([point(8), point(9, NaN), point(10)], WINDOW),
    ).toEqual({ status: "invalid_forecast" });
  });

  it("rejects invalid forecast timestamps", () => {
    expect(
      selectWeeklyWindowForecast(
        [{ ...point(8), time_utc: "invalid" }],
        WINDOW,
      ),
    ).toEqual({ status: "invalid_forecast" });
  });

  it.each([8, 9, 10])(
    "rejects duplicate forecast timestamps at hour %s",
    (hour) => {
      expect(
        selectWeeklyWindowForecast(
          [point(8), point(9), point(10), point(hour)],
          WINDOW,
        ),
      ).toEqual({ status: "invalid_forecast" });
    },
  );

  it("rejects invalid or reversed window boundaries", () => {
    expect(
      selectWeeklyWindowForecast([], { ...WINDOW, endUtc: WINDOW.startUtc }),
    ).toEqual({ status: "invalid_window" });
    expect(
      selectWeeklyWindowForecast([], { ...WINDOW, startUtc: "invalid" }),
    ).toEqual({ status: "invalid_window" });
  });

  it("does not substitute this week's data for a next-week occurrence", () => {
    const next = getNextWeeklyWindow(
      {
        weekdays: [2],
        startMinutes: 1080,
        endMinutes: 1200,
        timeZone: WINDOW.timeZone,
      },
      new Date("2026-09-15T11:00:00Z"),
    );
    expect(next.status).toBe("ok");
    if (next.status !== "ok") throw new Error("Expected next occurrence");
    expect(
      selectWeeklyWindowForecast([point(8), point(9), point(10)], next.window),
    ).toEqual({ status: "incomplete_forecast" });
  });
});

describe("weekly window risk summary", () => {
  it("uses the arithmetic mean and reports explicit minimum and maximum scores", () => {
    expect(
      summarizeWeeklyWindowRisk([point(8, 0.9), point(9, 1.6), point(10, 2.3)]),
    ).toEqual({
      averageRiskScore: 1.5999999999999999,
      minRiskScore: 0.9,
      maxRiskScore: 2.3,
    });
  });

  it("rejects empty or non-finite samples", () => {
    expect(summarizeWeeklyWindowRisk([])).toBeNull();
    expect(summarizeWeeklyWindowRisk([point(8, NaN)])).toBeNull();
  });
});
