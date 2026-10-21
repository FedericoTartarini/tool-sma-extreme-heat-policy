import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { CurrentRiskRecommendationsSection } from "@/components/home/recommendations/CurrentRiskRecommendationsSection";
import type { CoolingSelection } from "@/domain/activeCooling";
import { RISK_LEVELS, type RiskLevel } from "@/domain/riskRegistry";
import { i18n } from "@/i18n/i18n";
import { renderWithAppTheme } from "@/test/layoutTestUtils";

const heatRisk = vi.hoisted(() => ({
  hasCalculatedRisk: true,
  riskLevel: "high" as RiskLevel | null,
}));
const preferences = vi.hoisted(() => ({
  selection: { configured: false } as CoolingSelection,
  saveSelection: vi.fn(() => true),
}));

vi.mock("@/hooks/useHomeHeatRisk", () => ({
  useHomeHeatRisk: () => heatRisk,
}));
// Static SSR cannot subscribe to browser store updates. Supply the same
// selector boundary; browser checks use the real store and persistence.
vi.mock("@/store/coolingSelectionStore", () => ({
  useCoolingSelectionStore: (
    selector: (state: typeof preferences) => unknown,
  ) => selector(preferences),
}));

function renderSection() {
  return renderWithAppTheme(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <CurrentRiskRecommendationsSection />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

function entryText(markup: string): string {
  return (
    markup.match(
      /<button\b[^>]*aria-haspopup="dialog"[^>]*>[\s\S]*?<\/button>/,
    )?.[0] ?? ""
  ).replace(/<[^>]*>/g, "");
}

describe("CurrentRiskRecommendationsSection cooling preferences", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    heatRisk.hasCalculatedRisk = true;
    heatRisk.riskLevel = "high";
    preferences.selection = { configured: false };
  });

  afterEach(() => {
    preferences.selection = { configured: false };
  });

  it.each(RISK_LEVELS)("offers setup at %s risk", (level) => {
    heatRisk.riskLevel = level;
    const markup = renderSection();

    expect(entryText(markup)).toBe("Personalise cooling advice · Edit");
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).not.toContain('role="dialog"');
  });

  it("offers setup while recommendations are loading", () => {
    heatRisk.hasCalculatedRisk = false;
    heatRisk.riskLevel = null;

    expect(entryText(renderSection())).toBe(
      "Personalise cooling advice · Edit",
    );
  });

  it.each<CoolingSelection>([
    { configured: false },
    { configured: true, selectedOptionIds: ["fans"] },
    { configured: true, selectedOptionIds: [] },
  ])("uses the same entry without changing saved state %j", (selection) => {
    preferences.selection = selection;

    expect(entryText(renderSection())).toBe(
      "Personalise cooling advice · Edit",
    );
    expect(preferences.selection).toEqual(selection);
  });

  it("translates the complete entry in Chinese", async () => {
    await i18n.changeLanguage("zh-CN");

    expect(entryText(renderSection())).toBe("设置个性化降温建议 · 编辑");
  });

  it.each<CoolingSelection>([
    { configured: false },
    { configured: true, selectedOptionIds: [] },
    { configured: true, selectedOptionIds: ["fans"] },
  ])("preserves the recommendation grid and footer for %j", (selection) => {
    preferences.selection = selection;
    const markup = renderSection();

    for (const label of [
      "Stay hydrated",
      "Wear light clothing",
      "Rest Breaks",
      "Active Cooling",
    ]) {
      expect(markup).toContain(`>${label}<`);
    }
    expect(markup.match(/<img\b/g)).toHaveLength(4);
    expect(markup).toContain(
      i18n.t("home.sections.keyRecommendations.panelHint"),
    );
    expect(markup).toContain('aria-label="Open detailed advice"');
    expect(markup).not.toContain('role="dialog"');
  });
});
