import "@mantine/core/styles.css";
import "maplibre-gl/dist/maplibre-gl.css";

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { SiteShell } from "@/app/layout/SiteShell";
import { appTheme } from "@/config/mantineTheme";
import { i18n } from "@/i18n/i18n";
import { AboutPage } from "@/pages/AboutPage";
import { DetailedRecommendationsPage } from "@/pages/DetailedRecommendationsPage";
import { HomePage } from "@/pages/HomePage";

const routerBasename =
  import.meta.env.BASE_URL === "/"
    ? "/"
    : import.meta.env.BASE_URL.replace(/\/$/, "");

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <SiteShell />,
      children: [
        {
          index: true,
          element: <HomePage />,
        },
        {
          path: "about",
          element: <AboutPage />,
        },
        {
          path: "detailed-recommendations",
          element: <DetailedRecommendationsPage />,
        },
        {
          path: "*",
          element: <Navigate to="/" replace />,
        },
      ],
    },
  ],
  {
    basename: routerBasename,
  },
);

const queryClient = new QueryClient();

function AppContent() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

  return (
    <NuqsAdapter>
      <RouterProvider router={router} />
    </NuqsAdapter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={appTheme} defaultColorScheme="light">
        <I18nextProvider i18n={i18n}>
          <AppContent />
        </I18nextProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
