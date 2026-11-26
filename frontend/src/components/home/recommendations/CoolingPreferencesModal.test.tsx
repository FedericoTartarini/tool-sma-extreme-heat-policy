import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoolingPreferencesModal } from "@/components/home/recommendations/CoolingPreferencesModal";
import {
  ACTIVE_COOLING_OPTION_IDS,
  type CoolingOptionId,
  type CoolingSelection,
} from "@/domain/activeCooling";
import { i18n } from "@/i18n/i18n";
import { renderWithAppTheme } from "@/test/layoutTestUtils";

// Static rendering has no portal target. Interactive Modal behaviour is
// checked in a browser with the real Mantine component.
vi.mock("@mantine/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/core")>();
  return {
    ...actual,
    Modal: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
      <section>
        {title}
        {children}
      </section>
    ),
  };
});

function renderModal(
  selection: CoolingSelection<CoolingOptionId> = { configured: false },
) {
  return renderWithAppTheme(
    <I18nextProvider i18n={i18n}>
      <CoolingPreferencesModal
        selection={selection}
        onSave={() => true}
        onClose={() => undefined}
      />
    </I18nextProvider>,
  );
}

describe("CoolingPreferencesModal", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it.each(["en", "zh-CN"])(
    "labels every policy option in %s",
    async (language) => {
      await i18n.changeLanguage(language);
      const markup = renderModal();

      expect(markup.match(/type="checkbox"/g)).toHaveLength(5);
      for (const id of ACTIVE_COOLING_OPTION_IDS) {
        const label = i18n.t(`home.coolingPreferences.options.${id}`);
        expect(label).not.toBe(`home.coolingPreferences.options.${id}`);
        expect(markup).toContain(label);
        expect(markup).toContain(`value="${id}"`);
      }
      expect(markup).toContain(i18n.t("home.coolingPreferences.save"));
      expect(markup).toContain(i18n.t("home.coolingPreferences.cancel"));
    },
  );

  it("starts the draft with the saved checked options", () => {
    const markup = renderModal({
      configured: true,
      selectedOptionIds: ["fans"],
    });
    const inputs = markup.match(/<input\b[^>]*>/g) ?? [];
    const checked = inputs.filter((input) => /\bchecked=""/.test(input));

    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain('value="fans"');
  });

  it.each<CoolingSelection<CoolingOptionId>>([
    { configured: false },
    { configured: true, selectedOptionIds: [] },
  ])("allows confirming an empty draft for $configured", (selection) => {
    const markup = renderModal(selection);

    expect(markup).not.toContain('checked=""');
    expect(markup).not.toContain("disabled");
    expect(markup).toContain(i18n.t("home.coolingPreferences.emptyHint"));
    expect(markup).not.toContain('role="alert"');
  });
});
