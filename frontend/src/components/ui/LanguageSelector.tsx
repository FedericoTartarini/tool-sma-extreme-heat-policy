import { ActionIcon, Menu, Select, Tooltip } from "@mantine/core";
import { IconCheck, IconLanguage } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  isSupportedLanguage,
  LANGUAGE_OPTIONS,
  resolveSupportedLanguage,
} from "@/i18n/language";

interface LanguageSelectorProps {
  compact?: boolean;
}

/** Lets users switch between bundled languages. */
export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const currentLanguage = resolveSupportedLanguage(i18n.resolvedLanguage);

  const changeLanguage = (language: string | null) => {
    if (isSupportedLanguage(language)) {
      void i18n.changeLanguage(language);
    }
  };

  if (compact) {
    return (
      <Menu position="bottom-end" width={160} withinPortal>
        <Menu.Target>
          <Tooltip label={t("language.selectorLabel")}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={t("language.selectorLabel")}
            >
              <IconLanguage size={20} aria-hidden="true" />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          {LANGUAGE_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              onClick={() => changeLanguage(option.value)}
              rightSection={
                currentLanguage === option.value ? (
                  <IconCheck size={16} aria-hidden="true" />
                ) : null
              }
            >
              {t(option.labelKey)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Select
      aria-label={t("language.selectorLabel")}
      value={currentLanguage}
      onChange={changeLanguage}
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
