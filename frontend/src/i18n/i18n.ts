import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "@/i18n/locales/en/translation.json";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: enTranslation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});
