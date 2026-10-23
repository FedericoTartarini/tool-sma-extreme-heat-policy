import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  loadPersistedLanguage,
  resolveSupportedLanguage,
  savePersistedLanguage,
  toIntlLocale,
} from "@/i18n/language";

interface LocalStorageMock {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function installWindowMock(): Map<string, string> {
  const storage = new Map<string, string>();
  const localStorage: LocalStorageMock = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };

  vi.stubGlobal("window", { localStorage });
  return storage;
}

describe("language persistence", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = installWindowMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to English when no selection has been saved", () => {
    expect(loadPersistedLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it("loads a supported saved language", () => {
    storage.set(LANGUAGE_STORAGE_KEY, "zh-CN");
    expect(loadPersistedLanguage()).toBe("zh-CN");
  });

  it("ignores unsupported saved values", () => {
    storage.set(LANGUAGE_STORAGE_KEY, "fr");
    expect(loadPersistedLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it("saves supported languages only", () => {
    savePersistedLanguage("zh-CN");
    savePersistedLanguage("fr");
    expect(storage.get(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
  });
});

describe("language locale mapping", () => {
  it("falls back to English for unsupported values", () => {
    expect(resolveSupportedLanguage("fr")).toBe(DEFAULT_LANGUAGE);
    expect(resolveSupportedLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
  });

  it("maps app languages to Intl date locales", () => {
    expect(toIntlLocale("en")).toBe("en-AU");
    expect(toIntlLocale("zh-CN")).toBe("zh-CN");
    expect(toIntlLocale("fr")).toBe("en-AU");
  });
});
