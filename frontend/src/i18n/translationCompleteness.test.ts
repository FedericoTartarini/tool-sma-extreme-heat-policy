import { describe, expect, it } from "vitest";
import enTranslation from "@/i18n/locales/en/translation.json";
import zhCnTranslation from "@/i18n/locales/zh-CN/translation.json";

function toTranslationShape(value: unknown): unknown {
  if (typeof value === "string") {
    return "string";
  }

  if (Array.isArray(value)) {
    return value.map(toTranslationShape);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, toTranslationShape(nestedValue)]),
    );
  }

  return typeof value;
}

describe("Simplified Chinese translation completeness", () => {
  it("matches the complete English translation structure", () => {
    expect(toTranslationShape(zhCnTranslation)).toEqual(
      toTranslationShape(enTranslation),
    );
  });

  it("provides every About and legal section available in English", () => {
    expect(
      zhCnTranslation.about.sections.map((section) => section.iconKey),
    ).toEqual(enTranslation.about.sections.map((section) => section.iconKey));

    for (const section of zhCnTranslation.about.sections) {
      expect(section.title.trim()).not.toBe("");
      expect(section.paragraphs.length).toBeGreaterThan(0);
      expect(
        section.paragraphs.every((paragraph) =>
          paragraph.runs.every((run) => run.text.trim().length > 0),
        ),
      ).toBe(true);
    }
  });

  it("keeps the bibliographic citation in English", () => {
    expect(zhCnTranslation.footer.paperTitle).toBe(
      enTranslation.footer.paperTitle,
    );
    expect(zhCnTranslation.footer.authors).toBe(enTranslation.footer.authors);
    expect(zhCnTranslation.footer.journal).toBe(enTranslation.footer.journal);
  });
});
