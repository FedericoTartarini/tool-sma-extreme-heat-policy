import { beforeEach, describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { HomeRecommendationDetails } from "@/components/home/recommendations/HomeRecommendationDetails";
import { RecommendationLevelDetails } from "@/components/home/recommendations/RecommendationLevelDetails";
import type { CoolingOptionId, CoolingSelection } from "@/domain/activeCooling";
import type { RiskLevel } from "@/domain/riskRegistry";
import { i18n } from "@/i18n/i18n";
import { getRecommendationDetailContent } from "@/lib/recommendationDetails";
import { renderWithAppTheme } from "@/test/layoutTestUtils";

const states: CoolingSelection<CoolingOptionId>[] = [
  { configured: false },
  { configured: true, selectedOptionIds: ["fans", "cold-fluids-or-slushies"] },
  { configured: true, selectedOptionIds: [] },
];
function renderDetails(
  level: RiskLevel,
  selection: CoolingSelection<CoolingOptionId>,
) {
  const content = getRecommendationDetailContent(level, i18n.t);
  const original = structuredClone(content);
  const markup = renderWithAppTheme(
    <I18nextProvider i18n={i18n}>
      <HomeRecommendationDetails
        content={content}
        selection={selection}
        footer={<span>View all recommendations</span>}
      />
    </I18nextProvider>,
  );
  expect(content).toEqual(original);
  return { markup, content };
}
describe("HomeRecommendationDetails", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });
  it.each(["en", "zh-CN"])(
    "shows all methods without a reminder before configuration in %s",
    async (language) => {
      await i18n.changeLanguage(language);
      const { markup, content } = renderDetails("high", states[0]);
      expect(markup.match(/<li\b/g)).toHaveLength(5);
      for (const text of content.suggestions) expect(markup).toContain(text);
      expect(markup).not.toContain('role="note"');
    },
  );
  it("filters selected methods in policy order and preserves the grid, description and footer", () => {
    const { markup, content } = renderDetails("high", states[1]);
    expect(markup.match(/<li\b/g)).toHaveLength(2);
    expect(markup).toContain(content.suggestions[0]);
    expect(markup).toContain(content.suggestions[4]);
    expect(markup.indexOf(content.suggestions[0])).toBeLessThan(
      markup.indexOf(content.suggestions[4]),
    );
    for (const text of content.suggestions.slice(1, 4))
      expect(markup).not.toContain(text);
    expect(markup.match(/<img\b/g)).toHaveLength(4);
    expect(markup).toContain(content.description);
    expect(markup).toContain("View all recommendations");
    expect(markup).not.toContain('role="note"');
  });
  it.each(["en", "zh-CN"])(
    "keeps all methods and translates the empty-selection reminder in %s",
    async (language) => {
      await i18n.changeLanguage(language);
      const { markup, content } = renderDetails("high", states[2]);
      const reminder = i18n.t("home.coolingPreferences.prepareReminder");
      expect(reminder).not.toBe("home.coolingPreferences.prepareReminder");
      expect(markup.match(/<li\b/g)).toHaveLength(5);
      for (const text of content.suggestions) expect(markup).toContain(text);
      expect(markup).toContain('role="note"');
      expect(markup).toContain(reminder);
    },
  );
  it.each(["low", "moderate", "extreme"] as const)(
    "preserves complete %s details in all states",
    (level) => {
      for (const selection of states) {
        const { markup, content } = renderDetails(level, selection);
        const complete = renderWithAppTheme(
          <I18nextProvider i18n={i18n}>
            <RecommendationLevelDetails
              content={content}
              showLevelBadge
              footer={<span>View all recommendations</span>}
            />
          </I18nextProvider>,
        );
        expect(markup).toBe(complete);
      }
    },
  );
  it("leaves shared detailed content complete after Home personalisation", () => {
    const { content } = renderDetails("high", states[1]);
    const complete = renderWithAppTheme(
      <I18nextProvider i18n={i18n}>
        <RecommendationLevelDetails content={content} />
      </I18nextProvider>,
    );
    expect(complete.match(/<li\b/g)).toHaveLength(5);
    expect(complete).not.toContain('role="note"');
  });
});
