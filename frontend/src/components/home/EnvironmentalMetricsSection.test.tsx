import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EnvironmentalMetricsSection } from "@/components/home/EnvironmentalMetricsSection";
import { appTheme } from "@/config/mantineTheme";
import type { EnvironmentalInputs } from "@/domain/environmental";

const translations: Record<string, string> = {
  "environmental.rawDataTitle":
    "Raw Environmental Data for Current Sport Heat Risk",
  "environmental.airTemperature": "Air temperature",
  "environmental.windSpeed": "Wind speed",
  "environmental.relativeHumidity": "Relative humidity",
  "environmental.meanRadiantTemperature": "Mean radiant temperature",
  "environmental.directNormalIrradiance": "Direct normal irradiance",
  "environmental.units.celsius": "°C",
  "environmental.units.percent": "%",
  "environmental.units.metersPerSecond": "m/s",
  "environmental.units.wattsPerSquareMeter": "W/m²",
};

const sampleInputs: EnvironmentalInputs = {
  airTemperatureC: 16,
  meanRadiantTemperatureC: 16,
  relativeHumidityPct: 50,
  windSpeed10mMs: 3,
  directNormalIrradianceWm2: 10,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (!(key in translations)) {
        throw new Error(`Missing test translation for ${key}`);
      }

      return translations[key];
    },
  }),
}));

vi.mock("@/hooks/useIsMobileViewport", () => ({
  useIsMobileViewport: vi.fn(() => false),
}));

function renderSection(inputs: EnvironmentalInputs = sampleInputs): string {
  return renderToStaticMarkup(
    <MantineProvider theme={appTheme}>
      <EnvironmentalMetricsSection inputs={inputs} />
    </MantineProvider>,
  );
}

describe("EnvironmentalMetricsSection", () => {
  it("renders the raw data section title", () => {
    expect(renderSection()).toContain(
      "Raw Environmental Data for Current Sport Heat Risk",
    );
  });

  it("renders all five metrics with labeled units", () => {
    const markup = renderSection();

    expect(markup).toContain("Air temperature");
    expect(markup).toContain("Wind speed");
    expect(markup).toContain("Relative humidity");
    expect(markup).toContain("Mean radiant temperature");
    expect(markup).toContain("Direct normal irradiance");
    expect(markup).toContain("16.0°C");
    expect(markup).toContain("3.0 m/s");
    expect(markup).toContain("50%");
    expect(markup).toContain("10 W/m²");
  });

  it("updates displayed values when inputs change", () => {
    const markup = renderSection({
      ...sampleInputs,
      airTemperatureC: 31.2,
      meanRadiantTemperatureC: 37.4,
      relativeHumidityPct: 62,
    });

    expect(markup).toContain("31.2°C");
    expect(markup).toContain("37.4°C");
    expect(markup).toContain("62%");
  });

  it("renders all metrics on mobile", async () => {
    const { useIsMobileViewport } = await import("@/hooks/useIsMobileViewport");

    vi.mocked(useIsMobileViewport).mockReturnValue(true);

    const markup = renderSection();

    expect(markup).toContain("Air temperature");
    expect(markup).toContain("Direct normal irradiance");
    expect(markup).toContain("16.0°C");
  });
});
