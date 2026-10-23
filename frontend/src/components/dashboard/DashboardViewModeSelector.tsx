import { Collapse, SegmentedControl, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { DashboardOtherPeriodFields } from "@/components/dashboard/DashboardOtherPeriodFields";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  DASHBOARD_VIEW_MODES,
  isDashboardViewMode,
  type DashboardViewMode,
} from "@/domain/dashboardViewMode";
import { useDashboardStore } from "@/store/dashboardStore";

const FIELD_LABEL_WIDTH = 72;

interface DashboardViewModeSelectorProps {
  value: DashboardViewMode;
  onChange: (value: DashboardViewMode) => void;
}

/**
 * Segmented control for switching dashboard card metrics between view modes.
 */
export function DashboardViewModeSelector({
  value,
  onChange,
}: DashboardViewModeSelectorProps) {
  const { t } = useTranslation();
  const isOtherPeriodActive = value === "other_time_period";
  const otherPeriodDraft = useDashboardStore((state) => state.otherPeriodDraft);
  const setOtherPeriodWeekday = useDashboardStore(
    (state) => state.setOtherPeriodWeekday,
  );
  const setOtherPeriodStartMinutes = useDashboardStore(
    (state) => state.setOtherPeriodStartMinutes,
  );
  const setOtherPeriodEndMinutes = useDashboardStore(
    (state) => state.setOtherPeriodEndMinutes,
  );

  return (
    <Stack gap={CONTENT_GAP}>
      <SegmentedControl
        fullWidth
        value={value}
        onChange={(nextValue) => {
          if (isDashboardViewMode(nextValue)) {
            onChange(nextValue);
          }
        }}
        data={DASHBOARD_VIEW_MODES.map((mode) => ({
          value: mode,
          label: t(`dashboard.viewMode.options.${mode}`),
        }))}
        aria-label={t("dashboard.viewMode.label")}
      />
      <Collapse in={isOtherPeriodActive}>
        {isOtherPeriodActive ? (
          <DashboardOtherPeriodFields
            draft={otherPeriodDraft}
            onWeekdayChange={setOtherPeriodWeekday}
            onStartMinutesChange={setOtherPeriodStartMinutes}
            onEndMinutesChange={setOtherPeriodEndMinutes}
            labelWidth={FIELD_LABEL_WIDTH}
          />
        ) : null}
      </Collapse>
    </Stack>
  );
}
