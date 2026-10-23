import { MantineProvider } from "@mantine/core";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { appTheme } from "@/config/mantineTheme";

export const layoutI18nMock = {
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      resolvedLanguage: "en",
      changeLanguage: async () => undefined,
    },
  }),
};

export function renderWithAppTheme(children: ReactNode): string {
  return renderToStaticMarkup(
    createElement(MantineProvider, { theme: appTheme }, children),
  );
}
