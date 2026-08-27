import { Stack } from "@mantine/core";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { CityCardList } from "@/components/multicity/CityCardList";
import { MultiCityMainPanel } from "@/components/multicity/MultiCityMainPanel";
import { BottomToast } from "@/components/ui/BottomToast";
import { SECTION_STACK_GAP } from "@/config/uiLayout";
import type { MulticityLocationAddErrorReason } from "@/hooks/useMulticityLocationAdd";
import { useMulticityBootstrap } from "@/pages/multicity/useMulticityBootstrap";
import {
  createMulticityRiskUpdatedToast,
  type MulticityToastEvent,
} from "@/pages/multicity/multicityToast";
import { useMulticityHeatRisk } from "@/hooks/useMulticityHeatRisk";
import { useMulticityStore } from "@/store/multicityStore";

const MULTICITY_AUTO_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

function toMulticityAddErrorMessageKey(
  reason: MulticityLocationAddErrorReason,
): `multicity.errors.${MulticityLocationAddErrorReason}` {
  return `multicity.errors.${reason}`;
}

/**
 * Renders the multi-city dashboard page.
 */
export function MultiCityPage() {
  const { t } = useTranslation();
  useMulticityBootstrap();
  const locations = useMulticityStore((state) => state.locations);
  const sport = useMulticityStore((state) => state.sport);
  const heatRisk = useMulticityHeatRisk();
  const [toastEvent, setToastEvent] = useState<MulticityToastEvent | null>(
    null,
  );
  const nextToastEventIdRef = useRef(0);

  const publishToast = useCallback(
    (createToast: (id: number) => MulticityToastEvent) => {
      const nextToastEventId = nextToastEventIdRef.current + 1;
      nextToastEventIdRef.current = nextToastEventId;
      setToastEvent(createToast(nextToastEventId));
    },
    [],
  );

  const handleAddError = useCallback(
    (reason: MulticityLocationAddErrorReason) => {
      publishToast((id) => ({
        id,
        i18nKey: toMulticityAddErrorMessageKey(reason),
        variant: "error",
      }));
    },
    [publishToast],
  );
  const runScheduledRefresh = useEffectEvent(async () => heatRisk.refresh());

  useEffect(() => {
    if (!(locations.length > 0 && heatRisk.hasLoadedBatch)) {
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
          publishToast(createMulticityRiskUpdatedToast);
        }

        scheduleNextRefresh();
      }, MULTICITY_AUTO_REFRESH_INTERVAL_MS);
    };

    scheduleNextRefresh();

    return () => {
      isCancelled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [heatRisk.hasLoadedBatch, locations, publishToast, sport]);

  return (
    <>
      <Stack gap={SECTION_STACK_GAP}>
        <MultiCityMainPanel onAddError={handleAddError} />
        {locations.length > 0 ? (
          <CityCardList
            locations={locations}
            getCardState={heatRisk.getCardState}
          />
        ) : null}
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
