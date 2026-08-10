import { Select } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  LANGUAGE_OPTIONS,
} from "@/i18n/language";

/** Lets users switch between bundled languages. */
export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const currentLanguage = isSupportedLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : DEFAULT_LANGUAGE;

  return (
    <Select
      aria-label={t("language.selectorLabel")}
      value={currentLanguage}
      onChange={(language) => {
        if (isSupportedLanguage(language)) {
          void i18n.changeLanguage(language);
        }
      }}
      data={LANGUAGE_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      }))}
      leftSection={<IconLanguage size={16} aria-hidden="true" />}
      leftSectionPointerEvents="none"
      allowDeselect={false}
      w={{ base: "100%", sm: 150 }}
    />
  );
}
