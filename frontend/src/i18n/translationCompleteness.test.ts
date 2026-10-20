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

const PLACEHOLDER_PATTERN = /\{\{\s*[\w.]+\s*\}\}/g;

function collectPlaceholders(
  value: unknown,
  path = "",
  into = new Map<string, Set<string>>(),
): Map<string, Set<string>> {
  if (typeof value === "string") {
    const placeholders = value.match(PLACEHOLDER_PATTERN) ?? [];
    into.set(
      path,
      new Set(
        placeholders.map((placeholder) => placeholder.replace(/\s/g, "")),
      ),
    );
    return into;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, nested] of Object.entries(value)) {
      collectPlaceholders(nested, path ? `${path}.${key}` : key, into);
    }
  }

  return into;
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

  it("uses the same interpolation placeholders in every locale", () => {
    const english = collectPlaceholders(enTranslation);
    const chinese = collectPlaceholders(zhCnTranslation);

    for (const [path, expected] of english) {
      expect(
        [...(chinese.get(path) ?? [])].sort(),
        `zh-CN key "${path}"`,
      ).toEqual([...expected].sort());
    }
  });
});
