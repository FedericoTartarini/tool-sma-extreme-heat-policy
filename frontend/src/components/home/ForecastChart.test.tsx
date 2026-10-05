import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ForecastChart } from "@/components/home/ForecastChart";
import { appTheme } from "@/config/mantineTheme";
import type { ForecastPoint } from "@/domain/risk";
import { tFromEn } from "@/i18n/enTestTranslate";

const DAY_LABEL = "Monday 21 Sept";

const POINTS: ForecastPoint[] = [
  { time: "09:00", value: 1.2 },
  { time: "12:00", value: 3.4 },
  { time: "15:00", value: 2.6 },
];

vi.mock("react-i18next", async () => {
  const { tFromEn: translate } = await import("@/i18n/enTestTranslate");

  return {
    useTranslation: () => ({
      t: translate,
    }),
  };
});

vi.mock("@/hooks/useIsMobileViewport", () => ({
  useIsMobileViewport: () => false,
}));

vi.mock("@/components/ui/EChart", () => ({
  EChart: () => null,
}));

function renderChart(points: ForecastPoint[]): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <ForecastChart points={points} dayLabel={DAY_LABEL} />
    </MantineProvider>,
  );
}

describe("ForecastChart", () => {
  it("names the chart with the day's peak and its endpoints", () => {
    const markup = renderChart(POINTS);

    expect(markup).toContain('role="img"');
    expect(markup).toContain(
      tFromEn("charts.forecast.a11y.chartLabel", {
        day: DAY_LABEL,
        peakLevel: "High",
        peakTime: "12 PM",
        startLevel: "Low",
        endLevel: "Moderate",
      }),
    );
  });

  it("keeps the hourly table outside the role=img wrapper", () => {
    // role="img" turns its own subtree presentational, so a table nested inside
    // it is never reached. Everything else about the markup can stay the same
    // while this breaks, and only a screen reader would notice.
    const markup = renderChart(POINTS);
    const wrapperStart = markup.indexOf('role="img"');
    const wrapperEnd = markup.indexOf("</div>", wrapperStart);
    const tableStart = markup.indexOf("<table");

    expect(wrapperStart).toBeGreaterThan(-1);
    expect(tableStart).toBeGreaterThan(wrapperEnd);
  });

  it("captions the hourly table and heads every row with its hour", () => {
    const markup = renderChart(POINTS);

    expect(markup).toContain(
      tFromEn("charts.forecast.a11y.tableCaption", { day: DAY_LABEL }),
    );
    expect(markup).toContain('<th scope="col">Time</th>');
    expect(markup).toContain('<th scope="col">Risk level</th>');
    expect(markup).toContain('<th scope="col">Risk score</th>');
    expect(markup).toContain('<th scope="row">12 PM</th>');
    expect(markup).toContain("<td>High</td>");
    expect(markup).toContain("<td>3.4</td>");
  });

  it("offers a keyboard entry point to the chart", () => {
    expect(renderChart(POINTS)).toContain('tabindex="0"');
  });

  it("drops the text alternative for a day with no points", () => {
    const markup = renderChart([]);

    expect(markup).not.toContain('role="img"');
    expect(markup).not.toContain("tabindex");
    expect(markup).not.toContain("<table");
    expect(markup).not.toContain("Heat risk forecast for");
    expect(markup).not.toContain("undefined");
  });
});
