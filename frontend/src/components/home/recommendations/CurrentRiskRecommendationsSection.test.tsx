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

  it.each(RISK_LEVELS)(
    "keeps Home free of the preferences entry at %s risk",
    (level) => {
      heatRisk.riskLevel = level;
      const markup = renderSection();

      expect(markup).not.toContain("Personalise cooling advice");
      expect(markup).not.toContain("Cooling preferences");
      expect(markup.match(/<button\b/g)).toHaveLength(1);
      expect(markup).toContain('aria-haspopup="dialog"');
      expect(markup).not.toContain('role="dialog"');
    },
  );

  it("shows only the skeleton while recommendations are loading", () => {
    heatRisk.hasCalculatedRisk = false;
    heatRisk.riskLevel = null;

    const markup = renderSection();
    expect(markup).not.toContain("Personalise cooling advice");
    expect(markup).not.toContain("<button");
  });

  it.each<CoolingSelection>([
    { configured: false },
    { configured: true, selectedOptionIds: ["fans"] },
    { configured: true, selectedOptionIds: [] },
  ])(
    "does not expose a Home preferences entry or change saved state %j",
    (selection) => {
      preferences.selection = selection;

      expect(renderSection()).not.toContain("Personalise cooling advice");
      expect(preferences.selection).toEqual(selection);
    },
  );

  it("keeps the Chinese Home free of a preferences entry", async () => {
    await i18n.changeLanguage("zh-CN");

    expect(renderSection()).not.toContain("设置个性化降温建议");
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
