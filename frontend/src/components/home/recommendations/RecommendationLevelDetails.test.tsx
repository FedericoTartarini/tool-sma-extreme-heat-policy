import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RecommendationLevelDetails } from "@/components/home/recommendations/RecommendationLevelDetails";
import { appTheme } from "@/config/mantineTheme";

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
      <MantineProvider theme={appTheme}>
        <RecommendationLevelDetails
          content={{
            level: "low",
            levelLabel: "iyi",
            items: [],
            description: "Description",
            suggestions: ["Stay hydrated"],
          }}
          showLevelBadge
        />
      </MantineProvider>,
    );

    expect(markup).toContain("İYİ");
    expect(markup).not.toContain("IYI");
  });
  it("places optional Home controls after the description and before You should", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider theme={appTheme}>
        <RecommendationLevelDetails
          content={{
            level: "high",
            levelLabel: "High",
            items: [],
            description: "Policy description",
            suggestions: ["Policy method"],
          }}
          beforeSuggestions={<span>Cooling controls</span>}
        />
      </MantineProvider>,
    );
    expect(markup).toContain("Cooling controls");
    expect(markup.indexOf("Cooling controls")).toBeGreaterThan(
      markup.indexOf("Policy description"),
    );
    expect(markup.indexOf("Cooling controls")).toBeLessThan(
      markup.indexOf("recommendations.detailed.youShouldLabel"),
    );
  });
});
