export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "app-language:v1";

export const LANGUAGE_OPTIONS = [
  { value: "en", labelKey: "language.options.en" },
  { value: "zh-CN", labelKey: "language.options.zhCn" },
] as const;

export type SupportedLanguage = (typeof LANGUAGE_OPTIONS)[number]["value"];

const DATE_LOCALES: Record<SupportedLanguage, string> = {
  en: "en-AU",
  "zh-CN": "zh-CN",
};

/** Checks whether a value is one of the languages bundled with the app. */
export function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return LANGUAGE_OPTIONS.some((option) => option.value === value);
}

/** Returns a bundled language, defaulting to English when the value is unknown. */
export function resolveSupportedLanguage(value: unknown): SupportedLanguage {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

/** Maps an app language to the Intl locale used for dates. */
export function toIntlLocale(language: unknown): string {
  return DATE_LOCALES[resolveSupportedLanguage(language)];
}

/** Loads a supported language from localStorage, defaulting to English. */
export function loadPersistedLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  try {
    const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Persists a supported language without blocking the language change. */
export function savePersistedLanguage(language: string): void {
  if (typeof window === "undefined" || !isSupportedLanguage(language)) {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
