import { describe, expect, it } from "vitest";
import type { DashboardForecastSnapshot } from "@/domain/dashboardForecast";
import { resolveWeeklyWindowPreview } from "@/domain/weeklyWindowPreview";
import type { Weekday } from "@/domain/weeklyWindow";

const draft = {
  weekdays: [2] as Weekday[],
  startMinutes: 1080,
  endMinutes: 1200,
};
const now = new Date("2026-09-15T00:00:00Z");
function location(
  timezone: string | null = "Australia/Sydney",
): DashboardForecastSnapshot {
  return {
    sport: "SOCCER",
    latitude: -33.86,
    longitude: 151.21,
    timezone: timezone ?? "",
    forecast: [8, 9, 10].map((hour) => ({
      time_utc: `2026-09-15T${String(hour).padStart(2, "0")}:00:00Z`,
      time_local: `2026-09-15T${hour + 10}:00:00+10:00`,
      inputs: {
        tdb: 25,
        tr: 30,
        rh: 50,
        v_z1: 2,
        sol_radiation_dir: 200,
      },
      heat_risk: {
        risk_level_interpolated: 1.2,
        t_medium: 30,
        t_high: 35,
        t_extreme: 40,
        recommendation: "",
      },
    })),
  };
}
describe("weekly preview integration", () => {
  it("resolves local times using the selected result timezone and returns only real samples", () => {
    const result = resolveWeeklyWindowPreview(
      draft,
      { status: "ok", result: location() },
      now,
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("Expected a covered window");
    expect(result.window.startUtc).toBe("2026-09-15T08:00:00.000Z");
    expect(result.points).toHaveLength(3);
  });
  it.each(["loading", "unavailable"] as const)(
    "preserves %s without displaying a risk",
    (status) => {
      expect(resolveWeeklyWindowPreview(draft, { status }, now)).toEqual({
        status,
      });
    },
  );
  it.each([null, "", "Not/AZone"])(
    "does not substitute browser timezone for %s",
    (zone) => {
      expect(
        resolveWeeklyWindowPreview(
          draft,
          { status: "ok", result: location(zone) },
          now,
        ),
      ).toEqual({ status: "invalid_time_zone" });
    },
  );
  it("reports unavailable when the forecast is empty", () => {
    expect(
      resolveWeeklyWindowPreview(
        draft,
        { status: "ok", result: { ...location(), forecast: [] } },
        now,
      ),
    ).toEqual({ status: "unavailable" });
  });
  it("rejects an overnight selection", () => {
    expect(
      resolveWeeklyWindowPreview(
        { ...draft, endMinutes: 600 },
        { status: "ok", result: location() },
        now,
      ),
    ).toEqual({ status: "invalid_window" });
  });
  it("shows next week's date without pretending this week's data covers it", () => {
    const result = resolveWeeklyWindowPreview(
      draft,
      { status: "ok", result: location() },
      new Date("2026-09-15T08:00:01Z"),
    );
    expect(result.status).toBe("incomplete_forecast");
    if (result.status !== "incomplete_forecast")
      throw new Error("Expected incomplete coverage");
    expect(result.window.localDate).toBe("2026-09-22");
    expect(result).not.toHaveProperty("points");
  });
  it("distinguishes DST gaps from missing weather data", () => {
    expect(
      resolveWeeklyWindowPreview(
        { weekdays: [0], startMinutes: 120, endMinutes: 180 },
        { status: "ok", result: location() },
        new Date("2026-10-03T00:00:00Z"),
      ),
    ).toEqual({
      status: "unresolved_local_time",
      localDate: "2026-10-04",
      timeZone: "Australia/Sydney",
    });
  });
  it("rejects invalid scores without mapping them to low risk", () => {
    const result = location();
    result.forecast[1].heat_risk.risk_level_interpolated = NaN;
    expect(
      resolveWeeklyWindowPreview(draft, { status: "ok", result }, now),
    ).toEqual({ status: "invalid_forecast" });
  });
});
