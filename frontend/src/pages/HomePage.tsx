import { Stack } from "@mantine/core";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { CurrentRiskSection } from "@/components/home/CurrentRiskSection";
import { EnvironmentalMetricsSection } from "@/components/home/EnvironmentalMetricsSection";
import { FiltersSection } from "@/components/home/FiltersSection";
import { ForecastSection } from "@/components/home/ForecastSection";
import { LocationMapSection } from "@/components/home/LocationMapSection";
import { CurrentRiskRecommendationsSection } from "@/components/home/recommendations/CurrentRiskRecommendationsSection";
import { BottomToast } from "@/components/ui/BottomToast";
import { SECTION_STACK_GAP } from "@/config/uiLayout";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { useHomeUrlSync } from "@/hooks/useHomeUrlSync";
import type { HomeSuggestErrorReason } from "@/domain/homeErrorMap";
import {
  createCalculationErrorToast,
  createForecastUpdatedToast,
  createSuggestErrorToast,
  type HomeToastEvent,
} from "@/pages/home/homeToast";
import { useHomeBootstrap } from "@/pages/home/useHomeBootstrap";
import { useHomeStore } from "@/store/homeStore";
import { useHomeUiStore } from "@/store/homeUiStore";
import { useTranslation } from "react-i18next";

const HOME_AUTO_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

/**
 * Renders the Home page and wires Home-level state side effects.
 */
export function HomePage() {
  const { t } = useTranslation();
  const { setQueryStates } = useHomeBootstrap();
  const heatRisk = useHomeHeatRisk();
  const showRawData = useHomeUiStore((state) => state.showRawData);
  const profile = useHomeStore((state) => state.profile);
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const [toastEvent, setToastEvent] = useState<HomeToastEvent | null>(null);
  const nextToastEventIdRef = useRef(0);

  useHomeUrlSync({
    setQueryStates,
    canSyncSelection: heatRisk.canSyncSelection,
  });

  const publishToast = useCallback(
    (createToast: (id: number) => HomeToastEvent | null) => {
      const nextToastEventId = nextToastEventIdRef.current + 1;
      const nextToastEvent = createToast(nextToastEventId);

      if (!nextToastEvent) {
        return;
      }

      nextToastEventIdRef.current = nextToastEventId;
      setToastEvent(nextToastEvent);
    },
    [],
  );
  const handleLocationError = useCallback(
    (reason: HomeSuggestErrorReason) => {
      publishToast((id) => createSuggestErrorToast(id, reason));
    },
    [publishToast],
  );
  const runScheduledRefresh = useEffectEvent(async () => heatRisk.refresh());

  useEffect(() => {
    if (heatRisk.errorReason) {
      publishToast((id) =>
        createCalculationErrorToast(id, heatRisk.errorReason),
      );
    }
  }, [heatRisk.errorReason, publishToast]);

  useEffect(() => {
    if (
      !(
        selectedLocation !== null &&
        Boolean(sport) &&
        heatRisk.hasCalculatedRisk
      )
    ) {
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
          publishToast(createForecastUpdatedToast);
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
  }, [
    heatRisk.hasCalculatedRisk,
    profile,
    publishToast,
    selectedLocation,
    sport,
  ]);

  return (
    <>
      <Stack gap={SECTION_STACK_GAP}>
        <FiltersSection onLocationError={handleLocationError} />
        <CurrentRiskSection />
        {heatRisk.hasCalculatedRisk && showRawData ? (
          <EnvironmentalMetricsSection
            inputs={heatRisk.currentEnvironmentalInputs}
          />
        ) : null}
        <CurrentRiskRecommendationsSection />
        <ForecastSection />
        <LocationMapSection />
      </Stack>
      {toastEvent ? (
        <BottomToast
          eventId={toastEvent.id}
          message={t(toastEvent.i18nKey)}
          variant={toastEvent.variant}
          durationMs={toastEvent.durationMs}
        />
      ) : null}
    </>
  );
}
