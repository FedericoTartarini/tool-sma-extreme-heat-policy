import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ForecastSection } from "@/components/home/ForecastSection";
import { appTheme } from "@/config/mantineTheme";
import type { ForecastDay } from "@/domain/risk";

// 08:00 on the 22nd in Sydney is still the 21st in UTC, so the second day is
// named differently depending on which zone the forecast is read in.
const FORECAST: ForecastDay[] = [
  {
    date: "2026-09-21T11:00:00+10:00",
    risk: "low",
    points: [
      { time: "11:00", value: 1 },
      { time: "12:00", value: 2 },
    ],
  },
  {
    date: "2026-09-22T08:00:00+10:00",
    risk: "moderate",
    points: [
      { time: "08:00", value: 2 },
      { time: "09:00", value: 3 },
    ],
  },
];

const fixtures = vi.hoisted(() => ({ timeZone: "Australia/Sydney" }));

vi.mock("react-i18next", async () => {
  const { tFromEn: translate } = await import("@/i18n/enTestTranslate");

  return {
    useTranslation: () => ({
      t: translate,
      i18n: { resolvedLanguage: "en" },
    }),
  };
});

vi.mock("@/hooks/useIsMobileViewport", () => ({
  useIsMobileViewport: () => false,
}));

vi.mock("@/hooks/useHomeHeatRisk", () => ({
  useHomeHeatRisk: () => ({
    hasCalculatedRisk: true,
    forecast: FORECAST,
    meta: { timeZone: fixtures.timeZone },
  }),
}));

vi.mock("@/components/ui/EChart", () => ({
  EChart: () => null,
}));

function renderChartLabels(timeZone: string): string[] {
  fixtures.timeZone = timeZone;

  const markup = renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <ForecastSection />
    </MantineProvider>,
  );

  return [...markup.matchAll(/aria-label="([^"]*)"/g)]
    .map((match) => match[1])
    .filter((label) => label.startsWith("Heat risk forecast for"));
}

describe("ForecastSection", () => {
  it("names every chart after its own day", () => {
    // These names are the only way a screen reader user tells the charts apart.
    const labels = renderChartLabels("Australia/Sydney");

    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain("Monday 21 Sept");
    expect(labels[0]).not.toContain("22 Sept");
    expect(labels[1]).toContain("Tuesday 22 Sept");
    expect(labels[1]).not.toContain("21 Sept");
  });

  it("reads those days in the forecast's time zone, not the machine's", () => {
    // Comparing two zones keeps this honest wherever the suite runs: if the
    // time zone were ignored, both renders would produce the same name.
    const sydney = renderChartLabels("Australia/Sydney");
    const utc = renderChartLabels("UTC");

    expect(sydney[1]).toContain("Tuesday 22 Sept");
    expect(utc[1]).toContain("Monday 21 Sept");
  });

  it("captions each hourly table with the same day as its chart", () => {
    fixtures.timeZone = "Australia/Sydney";

    const markup = renderToStaticMarkup(
      <MantineProvider theme={appTheme}>
        <ForecastSection />
      </MantineProvider>,
    );
    const captions = [...markup.matchAll(/<caption[^>]*>([^<]*)</g)]
      .map((match) => match[1])
      .filter((caption) => caption.startsWith("Hourly heat risk for"));

    expect(captions).toEqual([
      "Hourly heat risk for Monday 21 Sept",
      "Hourly heat risk for Tuesday 22 Sept",
    ]);
  });
});
