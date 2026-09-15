import { Stack } from "@mantine/core";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { CurrentRiskSection } from "@/components/home/CurrentRiskSection";
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
import { useTranslation } from "react-i18next";

const HOME_AUTO_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

/**
 * Renders the Home page and wires Home-level state side effects.
 */
export function HomePage() {
  const { t } = useTranslation();
  const { setQueryStates } = useHomeBootstrap();
  const { canSyncSelection, errorReason, hasCalculatedRisk, refresh } =
    useHomeHeatRisk();
  const profile = useHomeStore((state) => state.profile);
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const [toastEvent, setToastEvent] = useState<HomeToastEvent | null>(null);
  const nextToastEventIdRef = useRef(0);

  useHomeUrlSync({
    setQueryStates,
    canSyncSelection,
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
  const runScheduledRefresh = useEffectEvent(async () => refresh());

  useEffect(() => {
    if (errorReason) {
      publishToast((id) => createCalculationErrorToast(id, errorReason));
    }
  }, [errorReason, publishToast]);

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
  }, [hasCalculatedRisk, profile, publishToast, selectedLocation, sport]);

  return (
    <>
      <Stack gap={SECTION_STACK_GAP}>
        <FiltersSection onLocationError={handleLocationError} />
        <CurrentRiskSection />
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
