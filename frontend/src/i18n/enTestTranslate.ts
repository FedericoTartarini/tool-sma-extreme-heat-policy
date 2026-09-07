import enTranslation from "@/i18n/locales/en/translation.json";

function interpolateTranslation(
  template: string,
  options?: Record<string, string | number>,
): string {
  if (!options) {
    return template;
  }

  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, name: string) => {
    const key = name.trim();
    return String(options[key] ?? `{{${key}}}`);
  });
}

export function tFromEn(
  key: string,
  options?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let value: unknown = enTranslation;
  for (const part of parts) {
    if (typeof value !== "object" || value === null || !(part in value)) {
      throw new Error(`Missing English translation for ${key}`);
    }
    value = (value as Record<string, unknown>)[part];
  }

  if (typeof value !== "string") {
    throw new Error(`English translation for ${key} is not a string`);
  }

  return interpolateTranslation(value, options);
}
