import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { loadPersistedLanguage, savePersistedLanguage } from "@/i18n/language";
import enTranslation from "@/i18n/locales/en/translation.json";
import zhCnTranslation from "@/i18n/locales/zh-CN/translation.json";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  lng: loadPersistedLanguage(),
  fallbackLng: "en",
  supportedLngs: ["en", "zh-CN"],
  resources: {
    en: {
      translation: enTranslation,
    },
    "zh-CN": {
      translation: zhCnTranslation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on("languageChanged", savePersistedLanguage);
