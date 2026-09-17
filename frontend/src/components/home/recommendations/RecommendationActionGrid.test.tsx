import { MantineProvider } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendationActionGrid } from "@/components/home/recommendations/RecommendationActionGrid";
import { appTheme } from "@/config/mantineTheme";
import type { RecommendationDetailItem } from "@/lib/recommendationDetails";

vi.mock("@mantine/hooks", () => ({
  useMediaQuery: vi.fn(),
}));

const items: RecommendationDetailItem[] = [
  {
    image: {
      src: "/actions/hydration-96.webp",
      srcSet: "/actions/hydration-48.webp 48w, /actions/hydration-96.webp 96w",
    },
    label: "Stay hydrated",
  },
  {
    image: {
      src: "/actions/clothing-96.webp",
      srcSet: "/actions/clothing-48.webp 48w, /actions/clothing-96.webp 96w",
    },
    label: "Wear light clothing",
  },
  {
    image: {
      src: "/actions/pause-96.webp",
      srcSet: "/actions/pause-48.webp 48w, /actions/pause-96.webp 96w",
    },
    label: "Rest breaks",
  },
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

    expect(markup).toContain('src="/actions/hydration-96.webp"');
    expect(markup).toMatch(
      /srcset="\/actions\/hydration-48\.webp 48w, \/actions\/hydration-96\.webp 96w"/i,
    );
    expect(markup).toContain('sizes="40px"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('alt="Stay hydrated"');
  });

  it("centers the final item in a compact odd-item grid", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    const markup = renderGrid();

    expect(markup.match(/grid-column:1 \/ -1/g)).toHaveLength(1);
    expect(markup).toContain("Rest breaks");
  });
});
