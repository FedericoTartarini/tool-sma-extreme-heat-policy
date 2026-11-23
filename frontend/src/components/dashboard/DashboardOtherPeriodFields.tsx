import { Box, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { DashboardTimeRangeFields } from "@/components/dashboard/DashboardTimeRangeFields";
import { DashboardWeekdayChips } from "@/components/dashboard/DashboardWeekdayChips";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  resolveDashboardOtherPeriodDraft,
  type DashboardOtherPeriodDraft,
} from "@/domain/dashboardOtherPeriod";

interface DashboardOtherPeriodFieldsProps {
  draft: DashboardOtherPeriodDraft;
  onWeekdayChange: (weekday: DashboardOtherPeriodDraft["weekday"]) => void;
  onStartMinutesChange: (minutes: number | null) => void;
  onEndMinutesChange: (minutes: number | null) => void;
  labelWidth: number;
  disabled?: boolean;
}

export function DashboardOtherPeriodFields({
  draft,
  onWeekdayChange,
  onStartMinutesChange,
  onEndMinutesChange,
  labelWidth,
  disabled = false,
}: DashboardOtherPeriodFieldsProps) {
  const { t } = useTranslation();
  const isInvalidSelection =
    resolveDashboardOtherPeriodDraft(draft).status === "invalid";

  return (
    <Stack gap={CONTENT_GAP}>
      <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
        <Text fw={600} w={labelWidth} ta="right">
          {t("dashboard.viewMode.otherPeriodDayLabel")}:
        </Text>
        <DashboardWeekdayChips
          mode="single"
          value={draft.weekday}
          onChange={onWeekdayChange}
          disabled={disabled}
          aria-label={t("dashboard.viewMode.otherPeriodDayLabel")}
        />
      </Group>

      <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
        <Text fw={600} w={labelWidth} ta="right">
          {t("dashboard.addLocation.timeLabel")}:
        </Text>
        <DashboardTimeRangeFields
          startMinutes={draft.startMinutes}
          endMinutes={draft.endMinutes}
          onStartMinutesChange={onStartMinutesChange}
          onEndMinutesChange={onEndMinutesChange}
          disabled={disabled}
        />
      </Group>

      <Group wrap="nowrap" align="flex-start" gap={CONTENT_GAP}>
        <Box w={labelWidth} visibleFrom="xs" />
        <Text c={isInvalidSelection ? "red" : "dimmed"} fz="sm" flex={1}>
          {t(
            isInvalidSelection
              ? "dashboard.viewMode.otherPeriodInvalidHint"
              : "dashboard.viewMode.otherPeriodTimeHint",
          )}
        </Text>
      </Group>
    </Stack>
  );
}
