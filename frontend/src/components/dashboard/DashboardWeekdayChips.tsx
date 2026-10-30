import { Chip, Group } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DASHBOARD_TIGHT_GAP } from "@/config/uiLayout";
import type { Weekday } from "@/domain/weeklyWindow";
import { toIntlLocale } from "@/i18n/language";
import { formatWeekday } from "@/lib/scheduleFormat";

const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

interface DashboardWeekdayChipsBaseProps {
  disabled?: boolean;
  "aria-label"?: string;
}

interface DashboardWeekdayChipsMultipleProps extends DashboardWeekdayChipsBaseProps {
  mode: "multiple";
  value: readonly Weekday[];
  onChange: (weekdays: readonly Weekday[]) => void;
}

interface DashboardWeekdayChipsSingleProps extends DashboardWeekdayChipsBaseProps {
  mode: "single";
  value: Weekday | null;
  onChange: (weekday: Weekday | null) => void;
}

export type DashboardWeekdayChipsProps =
  | DashboardWeekdayChipsMultipleProps
  | DashboardWeekdayChipsSingleProps;

export function DashboardWeekdayChips(props: DashboardWeekdayChipsProps) {
  const { t, i18n } = useTranslation();
  const locale = toIntlLocale(i18n.resolvedLanguage);
  const ariaLabel =
    props["aria-label"] ?? t("dashboard.addLocation.weekdaysLabel");

  const weekdayOptions = useMemo(
    () =>
      WEEKDAYS.map((day) => ({
        value: String(day),
        label: formatWeekday(day, locale),
      })),
    [locale],
  );

  if (props.mode === "single") {
    return (
      <Chip.Group
        multiple={false}
        value={props.value === null ? "" : String(props.value)}
        onChange={(value) => {
          if (value === "") {
            props.onChange(null);
            return;
          }
          props.onChange(Number(value) as Weekday);
        }}
      >
        <Group
          flex={1}
          gap={DASHBOARD_TIGHT_GAP}
          role="group"
          aria-label={ariaLabel}
        >
          {weekdayOptions.map((option) => (
            <Chip
              key={option.value}
              value={option.value}
              size="sm"
              disabled={props.disabled}
              styles={{ label: { paddingInline: 8 } }}
            >
              {option.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    );
  }

  return (
    <Chip.Group
      multiple
      value={props.value.map(String)}
      onChange={(values) =>
        props.onChange(
          values
            .map((value) => Number(value) as Weekday)
            .sort((left, right) => left - right),
        )
      }
    >
      <Group
        flex={1}
        gap={DASHBOARD_TIGHT_GAP}
        role="group"
        aria-label={ariaLabel}
      >
        {weekdayOptions.map((option) => (
          <Chip
            key={option.value}
            value={option.value}
            size="sm"
            disabled={props.disabled}
            styles={{ label: { paddingInline: 8 } }}
          >
            {option.label}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  );
}
