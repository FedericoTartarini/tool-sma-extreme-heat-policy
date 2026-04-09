import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RecommendationLevelDetails } from "@/components/home/recommendations/RecommendationLevelDetails";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "tr",
    },
  }),
}));

vi.mock("@/components/home/recommendations/RecommendationActionGrid", () => ({
  RecommendationActionGrid: () => null,
}));

describe("RecommendationLevelDetails", () => {
  it("uses locale-aware uppercase for the level badge label", () => {
    const markup = renderToStaticMarkup(
      <RecommendationLevelDetails
        content={{
          level: "low",
          levelLabel: "iyi",
          items: [],
          description: "Description",
          suggestions: ["Stay hydrated"],
        }}
        showLevelBadge
      />,
    );

    expect(markup).toContain("İYİ");
    expect(markup).not.toContain("IYI");
  });
});
