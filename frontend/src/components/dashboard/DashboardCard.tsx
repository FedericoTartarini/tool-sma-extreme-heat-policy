import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  DashboardCardRangeLine,
  DashboardCardTodayLine,
  DashboardMetricColumnLabel,
} from "@/components/dashboard/DashboardCardMetrics";
import { DashboardCardActions } from "@/components/dashboard/DashboardCardActions";
import { DashboardEditScheduleModal } from "@/components/dashboard/DashboardEditScheduleModal";
import { DashboardCardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { RiskStackedBar } from "@/components/dashboard/RiskStackedBar";
import {
  buildDashboardHomePath,
  DASHBOARD_HOME_LINK_STATE,
  type DashboardCardSchedule,
  type SavedDashboardCard,
  type UpdateDashboardCardScheduleResult,
} from "@/domain/dashboard";
import { type DashboardCardState } from "@/domain/dashboardCardState";
import type { DashboardOtherPeriodCardState } from "@/domain/dashboardOtherPeriodCardState";
import type { DashboardScheduledCardState } from "@/domain/dashboardScheduledCardState";
import {
  toDashboardFetchErrorI18nKey,
  toDashboardLocationErrorI18nKey,
} from "@/domain/dashboardErrorMap";
import type { DashboardViewMode } from "@/domain/dashboardViewMode";
import { sports } from "@/domain/sport";
import { toIntlLocale } from "@/i18n/language";
import {
  formatDashboardCardSchedule,
  formatLocalCalendarDate,
  formatScheduledWindowClockTime,
  formatScheduledWindowLocalDate,
  formatScheduledWindowTimeRange,
} from "@/lib/scheduleFormat";
import {
  COMPACT_GAP,
  CONTENT_GAP,
  CONTENT_PADDING,
  DASHBOARD_CARD_MIN_HEIGHT,
  DASHBOARD_TIGHT_GAP,
} from "@/config/uiLayout";
import {
  DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
  DASHBOARD_CARD_HIT_LAYER_Z_INDEX,
} from "@/config/uiScale";

type DashboardWindowMetricsState = Extract<
  DashboardScheduledCardState | DashboardOtherPeriodCardState,
  { status: "ok" }
>;

interface DashboardCardProps {
  card: SavedDashboardCard;
  cardState: DashboardCardState;
  scheduledCardState: DashboardScheduledCardState | null;
  otherPeriodCardState: DashboardOtherPeriodCardState | null;
  viewMode: DashboardViewMode;
  index: number;
  totalCount: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateSchedule: (
    schedule: DashboardCardSchedule,
  ) => UpdateDashboardCardScheduleResult;
}

function DashboardCardStatusMessage({
  cardState,
}: {
  cardState: DashboardCardState;
}) {
  const { t } = useTranslation();

  if (cardState.status === "fetch_error") {
    return (
      <Text c="dimmed" fz="sm">
        {t(
          toDashboardFetchErrorI18nKey(cardState.reason) ??
            "dashboard.cardErrors.generic",
        )}
      </Text>
    );
  }

  if (cardState.status === "location_error") {
    return (
      <Text c="dimmed" fz="sm">
        {t(toDashboardLocationErrorI18nKey(cardState.errorCode))}
      </Text>
    );
  }

  return (
    <Text c="dimmed" fz="sm">
      {t("dashboard.cardErrors.missingResult")}
    </Text>
  );
}

function dashboardWindowScheduleErrorKey(
  status: string,
  mode: "my_schedule" | "other_time_period",
): string {
  if (status === "incomplete_forecast") {
    return mode === "other_time_period"
      ? "dashboard.cardErrors.otherPeriodForecastUnavailable"
      : "dashboard.cardErrors.scheduleForecastUnavailable";
  }

  return mode === "other_time_period"
    ? "dashboard.cardErrors.otherPeriodUnavailable"
    : "dashboard.cardErrors.scheduleUnavailable";
}

function DashboardCardWindowMetrics({
  sessionHeading,
  coverageNote,
  metrics,
}: {
  sessionHeading: string | null;
  coverageNote: string | null;
  metrics: DashboardWindowMetricsState;
}) {
  const { t } = useTranslation();

  return (
    <Stack gap={DASHBOARD_TIGHT_GAP}>
      {sessionHeading ? (
        <Text c="dimmed" fz="sm" fw={600}>
          {sessionHeading}
        </Text>
      ) : null}
      <DashboardMetricColumnLabel>
        {t("dashboard.cards.metrics.average")}
      </DashboardMetricColumnLabel>
      <RiskStackedBar score={metrics.averageRiskScore} />
      <DashboardCardRangeLine
        minScore={metrics.minRiskScore}
        minLevel={metrics.minRiskLevel}
        maxScore={metrics.maxRiskScore}
        maxLevel={metrics.maxRiskLevel}
      />
      {coverageNote ? (
        <Text c="dimmed" fz="sm">
          {coverageNote}
        </Text>
      ) : null}
    </Stack>
  );
}

function DashboardCardMetricsContent({
  cardState,
  scheduledCardState,
  otherPeriodCardState,
  viewMode,
  intlLocale,
}: {
  cardState: DashboardCardState;
  scheduledCardState: DashboardScheduledCardState | null;
  otherPeriodCardState: DashboardOtherPeriodCardState | null;
  viewMode: DashboardViewMode;
  intlLocale: string;
}) {
  const { t } = useTranslation();

  if (viewMode === "now") {
    if (cardState.status !== "ok") {
      return <DashboardCardStatusMessage cardState={cardState} />;
    }

    return (
      <Stack gap={DASHBOARD_TIGHT_GAP}>
        <DashboardMetricColumnLabel>
          {t("dashboard.cards.metrics.current")}
        </DashboardMetricColumnLabel>
        <RiskStackedBar score={cardState.currentRiskScore} />
        <DashboardCardTodayLine
          score={cardState.todayMaxRiskScore}
          level={cardState.todayMaxRiskLevel}
        />
      </Stack>
    );
  }

  const windowState =
    viewMode === "my_schedule" ? scheduledCardState : otherPeriodCardState;
  const windowMode =
    viewMode === "my_schedule" ? "my_schedule" : "other_time_period";

  if (!windowState || windowState.status !== "ok") {
    if (
      windowState &&
      (windowState.status === "missing_selection" ||
        windowState.status === "invalid_selection")
    ) {
      return null;
    }

    if (
      windowState &&
      !["loading", "fetch_error", "location_error", "missing_result"].includes(
        windowState.status,
      )
    ) {
      return (
        <Text c="dimmed" fz="sm">
          {t(dashboardWindowScheduleErrorKey(windowState.status, windowMode))}
        </Text>
      );
    }

    return <DashboardCardStatusMessage cardState={cardState} />;
  }

  const sessionHeading =
    viewMode === "my_schedule"
      ? t("dashboard.cards.nextSessionHeading", {
          date: formatScheduledWindowLocalDate(windowState.window, intlLocale),
        })
      : null;
  const coverageNote = windowState.coveredFromUtc
    ? t("dashboard.cards.partialForecastNote", {
        time: formatScheduledWindowClockTime(
          windowState.coveredFromUtc,
          windowState.window.timeZone,
          intlLocale,
        ),
      })
    : null;

  return (
    <DashboardCardWindowMetrics
      sessionHeading={sessionHeading}
      coverageNote={coverageNote}
      metrics={windowState}
    />
  );
}

function DashboardCardHeader({
  homePath,
  title,
  scheduleLabel,
  openHomeAriaLabel,
  lineClamp,
  actions,
}: {
  homePath: string;
  title: string;
  scheduleLabel: string | null;
  openHomeAriaLabel: string;
  lineClamp: number;
  actions: ReactNode;
}) {
  return (
    <Stack gap={DASHBOARD_TIGHT_GAP}>
      <Group wrap="nowrap" align="center" gap={COMPACT_GAP}>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <DashboardCardTitleLink
            homePath={homePath}
            title={title}
            ariaLabel={openHomeAriaLabel}
            lineClamp={lineClamp}
          />
        </Box>
        {actions}
      </Group>
      {scheduleLabel ? (
        <Text c="dimmed" fz="sm" lineClamp={lineClamp}>
          {scheduleLabel}
        </Text>
      ) : null}
    </Stack>
  );
}

function DashboardCardTitleLink({
  homePath,
  title,
  ariaLabel,
  lineClamp,
}: {
  homePath: string;
  title: string;
  ariaLabel: string;
  lineClamp: number;
}) {
  return (
    <Text
      component={Link}
      to={homePath}
      state={DASHBOARD_HOME_LINK_STATE}
      fw={700}
      lineClamp={lineClamp}
      aria-label={ariaLabel}
      c="inherit"
      pos="relative"
      style={{
        textDecoration: "none",
        zIndex: DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
      }}
    >
      {title}
    </Text>
  );
}

function DashboardCardHomeOverlay({ homePath }: { homePath: string }) {
  return (
    <Link
      to={homePath}
      state={DASHBOARD_HOME_LINK_STATE}
      tabIndex={-1}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: DASHBOARD_CARD_HIT_LAYER_Z_INDEX,
      }}
    />
  );
}

/**
 * Renders a saved dashboard card for the active dashboard mode.
 */
export function DashboardCard({
  card,
  cardState,
  scheduledCardState,
  otherPeriodCardState,
  viewMode,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateSchedule,
}: DashboardCardProps) {
  const { t, i18n } = useTranslation();
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const sportLabel = useMemo(() => {
    const sportMeta = sports.find((meta) => meta.type === card.sport);

    return sportMeta
      ? t(sportMeta.labelKey)
      : t("home.sections.filters.selectedSportFallback");
  }, [card.sport, t]);
  const cardTitle = t("dashboard.cards.title", {
    sport: sportLabel,
    location: card.name,
  });
  const intlLocale = toIntlLocale(i18n.resolvedLanguage);
  const formatNextDayTime = (time: string) =>
    t("dashboard.cards.nextDayTime", { time });
  const scheduleLabel =
    viewMode === "my_schedule"
      ? formatDashboardCardSchedule(
          card.schedule,
          intlLocale,
          formatNextDayTime,
        )
      : viewMode === "other_time_period" &&
          otherPeriodCardState &&
          (otherPeriodCardState.status === "ok" ||
            otherPeriodCardState.status === "incomplete_forecast")
        ? t("dashboard.cards.selectedPeriodHeader", {
            date: formatScheduledWindowLocalDate(
              otherPeriodCardState.window,
              intlLocale,
            ),
            times: formatScheduledWindowTimeRange(
              otherPeriodCardState.window,
              intlLocale,
              formatNextDayTime,
            ),
          })
        : viewMode === "other_time_period" &&
            otherPeriodCardState?.status === "unresolved_local_time"
          ? t("dashboard.cards.selectedPeriodDateHeader", {
              date: formatLocalCalendarDate(
                otherPeriodCardState.localDate,
                intlLocale,
              ),
            })
          : null;
  const homePath = buildDashboardHomePath(card.sport, card.displayLabel);
  const openHomeAriaLabel = t("dashboard.cards.openHomeAriaLabel", {
    title: cardTitle,
  });

  if (
    cardState.status === "loading" ||
    (viewMode === "my_schedule" && scheduledCardState?.status === "loading") ||
    (viewMode === "other_time_period" &&
      otherPeriodCardState?.status === "loading")
  ) {
    return <DashboardCardSkeleton />;
  }

  const cardActionsProps = {
    index,
    totalCount,
    onRemove,
    onMoveUp,
    onMoveDown,
    canEditSchedule: viewMode === "my_schedule",
    onEditSchedule: () => setIsEditScheduleOpen(true),
  };

  return (
    <>
      <Box pos="relative">
        <Paper
          withBorder
          pos="relative"
          radius="md"
          p={CONTENT_PADDING.base}
          style={{
            minHeight: DASHBOARD_CARD_MIN_HEIGHT,
            cursor: "pointer",
          }}
        >
          <Stack gap={CONTENT_GAP}>
            <DashboardCardHeader
              homePath={homePath}
              title={cardTitle}
              scheduleLabel={scheduleLabel}
              openHomeAriaLabel={openHomeAriaLabel}
              lineClamp={2}
              actions={<DashboardCardActions {...cardActionsProps} />}
            />
            <DashboardCardMetricsContent
              cardState={cardState}
              scheduledCardState={scheduledCardState}
              otherPeriodCardState={otherPeriodCardState}
              viewMode={viewMode}
              intlLocale={intlLocale}
            />
          </Stack>
          <DashboardCardHomeOverlay homePath={homePath} />
        </Paper>
      </Box>
      {isEditScheduleOpen ? (
        <DashboardEditScheduleModal
          schedule={card.schedule}
          cardTitle={cardTitle}
          onClose={() => setIsEditScheduleOpen(false)}
          onSave={onUpdateSchedule}
        />
      ) : null}
    </>
  );
}
