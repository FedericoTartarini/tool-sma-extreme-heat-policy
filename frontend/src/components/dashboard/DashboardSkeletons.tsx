import { Group, Paper, Skeleton, Stack } from "@mantine/core";
import { CONTENT_PADDING } from "@/config/uiLayout";

/**
 * Renders a skeleton placeholder while a dashboard card's risk data loads.
 */
export function DashboardCardSkeleton() {
  return (
    <Paper
      withBorder
      radius="md"
      p={CONTENT_PADDING.base}
      style={{ minHeight: 168 }}
    >
      <Stack gap="sm">
        <Group wrap="nowrap" align="center" gap="xs">
          <Stack gap={4} style={{ flex: 1 }}>
            <Skeleton h={20} w="75%" radius="sm" />
          </Stack>
          <Group gap={4} wrap="nowrap">
            <Skeleton h={26} w={26} radius="sm" />
            <Skeleton h={26} w={26} radius="sm" />
            <Skeleton h={26} w={26} radius="sm" />
          </Group>
        </Group>
        <Skeleton h={14} w="30%" radius="sm" />
        <Skeleton h={56} w="100%" radius="xl" />
        <Skeleton h={14} w="55%" radius="sm" />
      </Stack>
    </Paper>
  );
}
