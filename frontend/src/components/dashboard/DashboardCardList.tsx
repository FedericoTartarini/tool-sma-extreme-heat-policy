import { SimpleGrid, Stack } from "@mantine/core";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import type { SavedDashboardCard } from "@/domain/dashboard";
import type { DashboardCardState } from "@/domain/dashboardCardState";
import type { DashboardOtherPeriodCardState } from "@/domain/dashboardOtherPeriodCardState";
import type { DashboardScheduledCardState } from "@/domain/dashboardScheduledCardState";
import type { DashboardViewMode } from "@/domain/dashboardViewMode";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { useDashboardStore } from "@/store/dashboardStore";

interface DashboardCardListProps {
  cards: SavedDashboardCard[];
  viewMode: DashboardViewMode;
  getCardState: (card: SavedDashboardCard) => DashboardCardState;
  getScheduledCardState: (
    card: SavedDashboardCard,
    now: Date,
  ) => DashboardScheduledCardState;
  getOtherPeriodCardState: (
    card: SavedDashboardCard,
    now: Date,
  ) => DashboardOtherPeriodCardState;
  scheduleNow: Date;
}

/**
 * Renders saved dashboard cards in a responsive grid or vertical list.
 */
export function DashboardCardList({
  cards,
  viewMode,
  getCardState,
  getScheduledCardState,
  getOtherPeriodCardState,
  scheduleNow,
}: DashboardCardListProps) {
  const isMobile = useIsMobileViewport();
  const removeCard = useDashboardStore((state) => state.removeCard);
  const moveCardUp = useDashboardStore((state) => state.moveCardUp);
  const moveCardDown = useDashboardStore((state) => state.moveCardDown);
  const updateCardSchedule = useDashboardStore(
    (state) => state.updateCardSchedule,
  );

  const renderCard = (card: SavedDashboardCard, index: number) => (
    <DashboardCard
      key={card.id}
      card={card}
      cardState={getCardState(card)}
      scheduledCardState={
        viewMode === "my_schedule"
          ? getScheduledCardState(card, scheduleNow)
          : null
      }
      otherPeriodCardState={
        viewMode === "other_time_period"
          ? getOtherPeriodCardState(card, scheduleNow)
          : null
      }
      viewMode={viewMode}
      index={index}
      totalCount={cards.length}
      onRemove={() => removeCard(card.id)}
      onMoveUp={() => moveCardUp(card.id)}
      onMoveDown={() => moveCardDown(card.id)}
      onUpdateSchedule={(schedule) => updateCardSchedule(card.id, schedule)}
    />
  );

  if (isMobile) {
    return (
      <Stack gap={CONTENT_GAP}>
        {cards.map((card, index) => renderCard(card, index))}
      </Stack>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={CONTENT_GAP}>
      {cards.map((card, index) => renderCard(card, index))}
    </SimpleGrid>
  );
}
