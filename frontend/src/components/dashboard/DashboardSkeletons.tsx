import { Group, Paper, Skeleton, Stack } from "@mantine/core";
import {
  ACTION_ICON_SIZE_SM,
  COMPACT_GAP,
  CONTENT_GAP,
  CONTENT_PADDING,
  DASHBOARD_CARD_MIN_HEIGHT,
  DASHBOARD_TIGHT_GAP,
} from "@/config/uiLayout";
import { RISK_STACKED_BAR_CHART_HEIGHT } from "@/config/uiScale";

// Approximate line heights of the card title (bold md text) and the small
// label/summary lines; skeleton bars stand in for text, so they are not exact.
const TITLE_LINE_HEIGHT = 20;
const SMALL_TEXT_LINE_HEIGHT = 14;

/**
 * Renders a skeleton placeholder while a dashboard card's risk data loads.
 */
export function DashboardCardSkeleton() {
  return (
    <Paper
      withBorder
      radius="md"
      p={CONTENT_PADDING.base}
      style={{ minHeight: DASHBOARD_CARD_MIN_HEIGHT }}
    >
      <Stack gap={CONTENT_GAP}>
        <Group wrap="nowrap" align="center" gap={COMPACT_GAP}>
          <Stack gap={DASHBOARD_TIGHT_GAP} style={{ flex: 1 }}>
            <Skeleton h={TITLE_LINE_HEIGHT} w="75%" radius="sm" />
          </Stack>
          <Group gap={DASHBOARD_TIGHT_GAP} wrap="nowrap">
            <Skeleton
              h={ACTION_ICON_SIZE_SM}
              w={ACTION_ICON_SIZE_SM}
              radius="sm"
            />
            <Skeleton
              h={ACTION_ICON_SIZE_SM}
              w={ACTION_ICON_SIZE_SM}
              radius="sm"
            />
            <Skeleton
              h={ACTION_ICON_SIZE_SM}
              w={ACTION_ICON_SIZE_SM}
              radius="sm"
            />
          </Group>
        </Group>
        <Skeleton h={SMALL_TEXT_LINE_HEIGHT} w="30%" radius="sm" />
        <Skeleton h={RISK_STACKED_BAR_CHART_HEIGHT} w="100%" radius="xl" />
        <Skeleton h={SMALL_TEXT_LINE_HEIGHT} w="55%" radius="sm" />
      </Stack>
    </Paper>
  );
}
