import { Group, Paper, Skeleton, Stack } from "@mantine/core";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import { MOBILE_CITY_CARD_ACTION_SIZE } from "@/config/uiScale";

interface CityCardSkeletonProps {
  isMobile?: boolean;
}

/**
 * Renders a skeleton placeholder while a city card's batch risk data loads.
 */
export function CityCardSkeleton({ isMobile = false }: CityCardSkeletonProps) {
  if (isMobile) {
    return (
      <Paper withBorder radius="md" p={CONTENT_PADDING.base}>
        <Group align="flex-start" wrap="nowrap" gap="sm">
          <Skeleton h={40} w={40} circle />
          <Stack gap="xs" style={{ flex: 1 }}>
            <Group align="stretch" wrap="nowrap" gap="xs">
              <Stack gap={4} style={{ flex: 1 }}>
                <Skeleton h={20} w="55%" radius="sm" />
                <Skeleton h={14} w="70%" radius="sm" />
              </Stack>
              <Skeleton
                style={{
                  alignSelf: "center",
                  flexShrink: 0,
                  height: MOBILE_CITY_CARD_ACTION_SIZE,
                  width: MOBILE_CITY_CARD_ACTION_SIZE,
                }}
                circle
              />
            </Group>
            <Skeleton h={28} w={80} radius="xl" />
            <Skeleton h={14} w="70%" radius="sm" />
          </Stack>
        </Group>
      </Paper>
    );
  }

  return (
    <Paper
      withBorder
      radius="md"
      p={CONTENT_PADDING.base}
      style={{ minHeight: 160 }}
    >
      <Stack gap={CONTENT_GAP} justify="space-between" h="100%">
        <Stack gap={4}>
          <Skeleton h={24} w="70%" radius="sm" />
          <Skeleton h={16} w="55%" radius="sm" />
        </Stack>
        <Skeleton h={32} w={112} radius="xl" />
        <Skeleton h={16} w="80%" radius="sm" />
      </Stack>
    </Paper>
  );
}
