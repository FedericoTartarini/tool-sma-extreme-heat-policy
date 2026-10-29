import { MantineProvider } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AllRiskRecommendationsSection } from "@/components/home/recommendations/AllRiskRecommendationsSection";
import { appTheme } from "@/config/mantineTheme";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/recommendationDetails", () => ({
  getRecommendationDetailContent: (level: string) => ({
    level,
    levelLabel: level,
    items: [],
    description: "",
    suggestions: [],
  }),
}));

vi.mock("@/components/home/recommendations/RecommendationLevelDetails", () => ({
  RecommendationLevelDetails: () => null,
}));

function renderAt(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <NuqsAdapter>
        <MantineProvider theme={appTheme}>
          <AllRiskRecommendationsSection />
        </MantineProvider>
      </NuqsAdapter>
    </MemoryRouter>,
  );
}

function getExpandedControlCount(markup: string): number {
  return markup.match(/aria-expanded="true"/g)?.length ?? 0;
}

describe("AllRiskRecommendationsSection", () => {
  it("opens the item for the level passed in the link", () => {
    const markup = renderAt("/detailed-recommendations?level=moderate");

    expect(getExpandedControlCount(markup)).toBe(1);
    expect(markup).toMatch(
      /id="recommendation-level-moderate"[^]*?aria-expanded="true"[^]*?id="recommendation-level-high"/,
    );
  });

  it("opens no item when the link has no valid level", () => {
    expect(getExpandedControlCount(renderAt("/detailed-recommendations"))).toBe(
      0,
    );
    expect(
      getExpandedControlCount(
        renderAt("/detailed-recommendations?level=medium"),
      ),
    ).toBe(0);
  });
});
