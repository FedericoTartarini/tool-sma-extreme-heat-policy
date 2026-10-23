import { Group, Select } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toIntlLocale } from "@/i18n/language";
import { formatMinutesOfDay } from "@/lib/scheduleFormat";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

interface DashboardTimeRangeFieldsProps {
  startMinutes: number | null;
  endMinutes: number | null;
  onStartMinutesChange: (minutes: number | null) => void;
  onEndMinutesChange: (minutes: number | null) => void;
  disabled?: boolean;
}

export function DashboardTimeRangeFields({
  startMinutes,
  endMinutes,
  onStartMinutesChange,
  onEndMinutesChange,
  disabled = false,
}: DashboardTimeRangeFieldsProps) {
  const { t, i18n } = useTranslation();
  const locale = toIntlLocale(i18n.resolvedLanguage);

  const startTimeOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        value: String(hour * MINUTES_PER_HOUR),
        label: formatMinutesOfDay(hour * MINUTES_PER_HOUR, locale),
      })),
    [locale],
  );
  const endTimeOptions = useMemo(
    () => [
      ...startTimeOptions.slice(1),
      {
        value: String(MINUTES_PER_DAY),
        label: t("dashboard.addLocation.midnight"),
      },
    ],
    [startTimeOptions, t],
  );

  return (
    <Group flex={1} wrap="nowrap" gap="xs">
      <Select
        flex={1}
        aria-label={t("dashboard.addLocation.startTime")}
        placeholder={t("dashboard.addLocation.startTime")}
        size="md"
        data={startTimeOptions}
        value={startMinutes === null ? null : String(startMinutes)}
        onChange={(value) =>
          onStartMinutesChange(value === null ? null : Number(value))
        }
        disabled={disabled}
      />
      <Select
        flex={1}
        aria-label={t("dashboard.addLocation.endTime")}
        placeholder={t("dashboard.addLocation.endTime")}
        size="md"
        data={endTimeOptions}
        value={endMinutes === null ? null : String(endMinutes)}
        onChange={(value) =>
          onEndMinutesChange(value === null ? null : Number(value))
        }
        disabled={disabled}
      />
    </Group>
  );
}
