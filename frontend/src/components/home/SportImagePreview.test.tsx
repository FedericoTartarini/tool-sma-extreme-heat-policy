import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SportImagePreview } from "@/components/home/SportImagePreview";
import { appTheme } from "@/config/mantineTheme";
import type { ResponsiveImageAsset } from "@/lib/responsiveImage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "home.sections.filters.sportImageHelp") {
        return `Add an image for ${options?.sportLabel} at ${options?.path}.`;
      }
      if (key === "home.sections.filters.sportImageNotConfigured") {
        return `No image is configured for ${options?.sportLabel}.`;
      }
      return key;
    },
  }),
}));

const basketballImage: ResponsiveImageAsset = {
  src: "/sports/basketball-816.webp",
  srcSet:
    "/sports/basketball-320.webp 320w, /sports/basketball-640.webp 640w, /sports/basketball-816.webp 816w",
  sizes: "(max-width: 720px) calc(100vw - 3rem), calc(720px - 3rem)",
};

function renderSportImagePreview(
  image: ResponsiveImageAsset | null,
  failedImageUrl: string | null,
): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <SportImagePreview
        image={image}
        sportLabel="Basketball"
        failedImageUrl={failedImageUrl}
        onImageLoadFailure={() => undefined}
      />
    </MantineProvider>,
  );
}

describe("SportImagePreview", () => {
  it("renders the sport image fallback after a load failure", () => {
    const failedImageUrl = "/sports/basketball-640.webp";
    const markup = renderSportImagePreview(basketballImage, failedImageUrl);

    expect(markup).not.toContain("<img");
    expect(markup).toContain("home.sections.filters.sportImageUnavailable");
    expect(markup).toContain(
      `Add an image for Basketball at ${failedImageUrl}.`,
    );
  });

  it("renders the no-config fallback when a sport has no image", () => {
    const markup = renderSportImagePreview(null, null);

    expect(markup).not.toContain("<img");
    expect(markup).toContain("home.sections.filters.sportImageUnavailable");
    expect(markup).toContain("No image is configured for Basketball.");
  });
});
