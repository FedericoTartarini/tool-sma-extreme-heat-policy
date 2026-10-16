import { Stack } from "@mantine/core";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { WeeklyWindowPreview } from "@/components/dashboard/WeeklyWindowPreview";
import { DashboardCardList } from "@/components/dashboard/DashboardCardList";
import { DashboardMainPanel } from "@/components/dashboard/DashboardMainPanel";
import { DashboardOverviewSection } from "@/components/dashboard/DashboardOverviewSection";
import { DashboardViewModeSelector } from "@/components/dashboard/DashboardViewModeSelector";
import { BottomToast } from "@/components/ui/BottomToast";
import { SectionCard } from "@/components/ui/SectionCard";
import { SECTION_STACK_GAP } from "@/config/uiLayout";
import { MAX_DASHBOARD_CARDS } from "@/domain/dashboard";
import type { DashboardLocationAddErrorReason } from "@/hooks/useDashboardLocationAdd";
import { useDashboardHeatRisk } from "@/hooks/useDashboardHeatRisk";
import { useDashboardScheduleClock } from "@/hooks/useDashboardScheduleClock";
import {
  createDashboardRefreshFailedToast,
  createDashboardRiskUpdatedToast,
  type DashboardToastEvent,
} from "@/pages/dashboard/dashboardToast";
import { useDashboardBootstrap } from "@/pages/dashboard/useDashboardBootstrap";
import { useDashboardStore } from "@/store/dashboardStore";

const DASHBOARD_AUTO_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

function toDashboardAddErrorMessageKey(
  reason: DashboardLocationAddErrorReason,
): `dashboard.errors.${DashboardLocationAddErrorReason}` {
  return `dashboard.errors.${reason}`;
}

/**
 * Renders the multi-location dashboard page.
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  useDashboardBootstrap();
  const cards = useDashboardStore((state) => state.cards);
  const viewMode = useDashboardStore((state) => state.viewMode);
  const setViewMode = useDashboardStore((state) => state.setViewMode);
  const heatRisk = useDashboardHeatRisk();
  const scheduleNow = useDashboardScheduleClock();
  const [toastEvent, setToastEvent] = useState<DashboardToastEvent | null>(
    null,
  );
  const nextToastEventIdRef = useRef(0);

  const publishToast = useCallback(
    (createToast: (id: number) => DashboardToastEvent) => {
      const nextToastEventId = nextToastEventIdRef.current + 1;
      nextToastEventIdRef.current = nextToastEventId;
      setToastEvent(createToast(nextToastEventId));
    },
    [],
  );

  const handleAddError = useCallback(
    (reason: DashboardLocationAddErrorReason) => {
      publishToast((id) => ({
        id,
        i18nKey: toDashboardAddErrorMessageKey(reason),
        variant: "error",
      }));
    },
    [publishToast],
  );
  const runScheduledRefresh = useEffectEvent(async () => heatRisk.refresh());

  useEffect(() => {
    if (!(cards.length > 0 && heatRisk.hasLoadedCardData)) {
      return;
    }

    let timeoutId: number | null = null;
    let isCancelled = false;

    const scheduleNextRefresh = () => {
      timeoutId = window.setTimeout(async () => {
        const refreshResult = await runScheduledRefresh();

        if (isCancelled) {
          return;
        }

        if (refreshResult.hasAnySuccess) {
          publishToast(createDashboardRiskUpdatedToast);
        } else if (refreshResult.hasAnyFailure) {
          publishToast(createDashboardRefreshFailedToast);
        }

        scheduleNextRefresh();
      }, DASHBOARD_AUTO_REFRESH_INTERVAL_MS);
    };

    scheduleNextRefresh();

    return () => {
      isCancelled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [cards.length, heatRisk.hasLoadedCardData, publishToast]);

  return (
    <>
      <Stack gap={SECTION_STACK_GAP}>
        <DashboardOverviewSection />
        {cards.length > 0 ? (
          <Stack gap={SECTION_STACK_GAP}>
            <SectionCard title={t("dashboard.viewMode.label")}>
              <DashboardViewModeSelector
                value={viewMode}
                onChange={setViewMode}
              />
            </SectionCard>
            <DashboardCardList
              cards={cards}
              viewMode={viewMode}
              getCardState={heatRisk.getCardState}
              getScheduledCardState={heatRisk.getScheduledCardState}
              getOtherPeriodCardState={heatRisk.getOtherPeriodCardState}
              scheduleNow={scheduleNow}
            />
          </Stack>
        ) : null}
        <DashboardMainPanel onAddError={handleAddError} />
        {import.meta.env.DEV && searchParams.get("weeklyPreview") === "1" ? (
          <WeeklyWindowPreview
            cards={cards}
            getSource={heatRisk.getWeeklyPreviewSource}
          />
        ) : null}
      </Stack>

      {toastEvent ? (
        <BottomToast
          eventId={toastEvent.id}
          message={t(toastEvent.i18nKey, {
            maxCards: MAX_DASHBOARD_CARDS,
          })}
          variant={toastEvent.variant}
          durationMs={toastEvent.durationMs}
        />
      ) : null}
    </>
  );
}
