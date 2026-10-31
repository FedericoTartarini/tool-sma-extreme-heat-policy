import { Box, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { DashboardTimeRangeFields } from "@/components/dashboard/DashboardTimeRangeFields";
import { DashboardWeekdayChips } from "@/components/dashboard/DashboardWeekdayChips";
import { CONTENT_GAP } from "@/config/uiLayout";
import { resolveDashboardCardScheduleDraft } from "@/domain/dashboard";
import type { Weekday } from "@/domain/weeklyWindow";

interface DashboardScheduleFieldsProps {
  weekdays: readonly Weekday[];
  startMinutes: number | null;
  endMinutes: number | null;
  onWeekdaysChange: (weekdays: readonly Weekday[]) => void;
  onStartMinutesChange: (minutes: number | null) => void;
  onEndMinutesChange: (minutes: number | null) => void;
  labelWidth: number;
  disabled?: boolean;
}

export function DashboardScheduleFields({
  weekdays,
  startMinutes,
  endMinutes,
  onWeekdaysChange,
  onStartMinutesChange,
  onEndMinutesChange,
  labelWidth,
  disabled = false,
}: DashboardScheduleFieldsProps) {
  const { t } = useTranslation();
  const isInvalidSelection =
    resolveDashboardCardScheduleDraft({ weekdays, startMinutes, endMinutes })
      .status === "invalid";

  return (
    <>
      <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
        <Text fw={600} w={labelWidth} ta="right">
          {t("dashboard.addLocation.weekdaysLabel")}:
        </Text>
        <DashboardWeekdayChips
          mode="multiple"
          value={weekdays}
          onChange={onWeekdaysChange}
          disabled={disabled}
        />
      </Group>

      <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
        <Text fw={600} w={labelWidth} ta="right">
          {t("dashboard.addLocation.timeLabel")}:
        </Text>
        <DashboardTimeRangeFields
          startMinutes={startMinutes}
          endMinutes={endMinutes}
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
              ? "dashboard.addLocation.scheduleInvalidHint"
              : "dashboard.addLocation.scheduleRequired",
          )}
        </Text>
      </Group>
    </>
  );
}
