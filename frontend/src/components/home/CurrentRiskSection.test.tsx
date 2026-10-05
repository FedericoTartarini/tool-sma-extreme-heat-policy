import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { CurrentRiskSection } from "@/components/home/CurrentRiskSection";
import { appTheme } from "@/config/mantineTheme";
import type { RiskLevel } from "@/domain/risk";
import { tFromEn } from "@/i18n/enTestTranslate";

const fixtures = vi.hoisted(() => ({
  score: 1,
  riskLevel: "low" as RiskLevel,
}));

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

vi.mock("@/hooks/useHomeHeatRisk", () => ({
  useHomeHeatRisk: () => ({
    hasCalculatedRisk: true,
    riskLevel: fixtures.riskLevel,
    risk: { riskLevelInterpolated: fixtures.score },
  }),
}));

vi.mock("@/store/homeStore", () => ({
  useHomeStore: (selector: (state: { profile: string }) => unknown) =>
    selector({ profile: "ADULT" }),
}));

vi.mock("@/components/ui/EChart", () => ({
  EChart: () => null,
}));

function renderSection(score: number, riskLevel: RiskLevel): string {
  fixtures.score = score;
  fixtures.riskLevel = riskLevel;

  return renderToStaticMarkup(
    <MemoryRouter>
      <MantineProvider theme={appTheme}>
        <CurrentRiskSection />
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe("CurrentRiskSection", () => {
  it("names the gauge with its score, scale and risk level", () => {
    // The score is painted onto a canvas and its on-screen copy is aria-hidden,
    // so the label is the only route to the reading.
    const markup = renderSection(1, "low");

    expect(markup).toContain(
      `aria-label="${tFromEn("charts.gauge.a11y.label", {
        title: "Heat Risk",
        value: "1.0",
        max: 5,
        level: "Low",
      })}"`,
    );
  });

  it("tracks the level as the score moves into another band", () => {
    const markup = renderSection(3.4, "high");

    expect(markup).toContain(
      `aria-label="${tFromEn("charts.gauge.a11y.label", {
        title: "Heat Risk",
        value: "3.4",
        max: 5,
        level: "High",
      })}"`,
    );
  });

  it("falls back to a plain sentence when there is no score to read", () => {
    const markup = renderSection(Number.NaN, "low");

    expect(markup).toContain(
      `aria-label="${tFromEn("charts.gauge.a11y.labelUnavailable", {
        title: "Heat Risk",
      })}"`,
    );
    expect(markup).not.toContain("out of 5");
    expect(markup).not.toContain("NaN");
  });
});
