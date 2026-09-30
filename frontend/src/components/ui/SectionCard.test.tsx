import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionCard } from "@/components/ui/SectionCard";

describe("SectionCard", () => {
  it("renders the actions slot beside the title", () => {
    const markup = renderToStaticMarkup(
      <MantineProvider>
        <SectionCard
          title="Forecasted risk"
          actions={<button type="button">Toggle details</button>}
        >
          <p>Forecast content</p>
        </SectionCard>
      </MantineProvider>,
    );

    expect(markup).toContain("Forecasted risk");
    expect(markup).toContain("Toggle details");
    expect(markup).toContain("Forecast content");
  });
});
