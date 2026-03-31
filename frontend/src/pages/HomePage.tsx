import { Stack } from "@mantine/core";
import { useEffect, useEffectEvent, useState } from "react";
import { CurrentRiskSection } from "@/components/home/CurrentRiskSection";
import { FiltersSection } from "@/components/home/FiltersSection";
import { ForecastSection } from "@/components/home/ForecastSection";
import { KeyRecommendationsSection } from "@/components/home/KeyRecommendationsSection";
import { LocationMapSection } from "@/components/home/LocationMapSection";
import { BottomToast } from "@/components/ui/BottomToast";
import { SECTION_STACK_GAP } from "@/config/uiLayout";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useHomeUrlSync } from "@/hooks/useHomeUrlSync";
import { useHomeBootstrap } from "@/pages/home/useHomeBootstrap";
import { useHomeStore } from "@/store/homeStore";
import { useTranslation } from "react-i18next";

const HOME_AUTO_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

/**
 * Renders the Home page and wires Home-level state side effects.
 */
export function HomePage() {
  const { t } = useTranslation();
  const { setQueryStates } = useHomeBootstrap();
  const { canSyncSelection, hasCalculatedRisk, refresh } = useHomeHeatRisk();
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const [refreshToastEventId, setRefreshToastEventId] = useState(0);

  useHomeUrlSync({
    setQueryStates,
    canSyncSelection,
  });

  const runScheduledRefresh = useEffectEvent(async () => refresh());

  useEffect(() => {
    if (!(selectedLocation !== null && Boolean(sport) && hasCalculatedRisk)) {
      return;
    }

    let timeoutId: number | null = null;
    let isCancelled = false;

    const scheduleNextRefresh = () => {
      timeoutId = window.setTimeout(async () => {
        const didRefresh = await runScheduledRefresh();

        if (isCancelled) {
          return;
        }

        if (didRefresh) {
          setRefreshToastEventId((currentId) => currentId + 1);
        }

        scheduleNextRefresh();
      }, HOME_AUTO_REFRESH_INTERVAL_MS);
    };

    scheduleNextRefresh();

    return () => {
      isCancelled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [hasCalculatedRisk, selectedLocation, sport]);

  return (
    <>
      <Stack gap={SECTION_STACK_GAP}>
        <FiltersSection />
        <CurrentRiskSection />
        <KeyRecommendationsSection />
        <ForecastSection />
        <LocationMapSection />
      </Stack>
      <BottomToast
        eventId={refreshToastEventId}
        message={t("home.notifications.forecastUpdated")}
      />
    </>
  );
}
