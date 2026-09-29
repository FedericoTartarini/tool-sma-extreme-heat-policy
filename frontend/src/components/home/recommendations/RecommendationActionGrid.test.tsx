import { MantineProvider } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendationActionGrid } from "@/components/home/recommendations/RecommendationActionGrid";
import { appTheme } from "@/config/mantineTheme";
import { RECOMMENDATION_ACTION_ASSETS } from "@/domain/recommendationActionAssets";
import type { RecommendationDetailItem } from "@/lib/recommendationDetails";

vi.mock("@mantine/hooks", () => ({
  useMediaQuery: vi.fn(),
}));

const hydrationImage = RECOMMENDATION_ACTION_ASSETS.hydration;

if (hydrationImage === null) {
  throw new Error("Hydration action image must be configured for this test.");
}

const items: RecommendationDetailItem[] = [
  { image: hydrationImage, label: "Stay hydrated" },
];

function renderGrid(gridItems: RecommendationDetailItem[] = items): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <RecommendationActionGrid items={gridItems} />
    </MantineProvider>,
  );
}

describe("RecommendationActionGrid", () => {
  beforeEach(() => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
  });

  it("renders responsive lazy-loaded recommendation images", () => {
    const markup = renderGrid([items[0]]);

    expect(markup).toContain('src="/actions/hydration-192.webp"');
    expect(markup).toMatch(
      /srcset="\/actions\/hydration-48\.webp 48w, \/actions\/hydration-96\.webp 96w, \/actions\/hydration-192\.webp 192w"/i,
    );
    expect(markup).toContain('sizes="2.5rem"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('alt="Stay hydrated"');
  });

  it("renders extreme stop advice without an image", () => {
    const markup = renderGrid([
      { image: null, label: "Consider Suspending Play" },
    ]);

    expect(markup).toContain(">Consider Suspending Play<");
    expect(markup).not.toContain("<img");
  });

  it("keeps all labels when only some images are available", () => {
    const markup = renderGrid([
      ...items,
      { image: null, label: "Wear light clothing" },
    ]);

    expect(markup).toContain(">Stay hydrated<");
    expect(markup).toContain(">Wear light clothing<");
    expect(markup.match(/<img\b/g)).toHaveLength(1);
  });
});
