import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardScheduleFields } from "@/components/dashboard/DashboardScheduleFields";
import { FILTER_FIELD_LABEL_WIDTH } from "@/components/filters/LocationSuggestField";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  resolveDashboardCardScheduleDraft,
  type DashboardCardSchedule,
  type UpdateDashboardCardScheduleResult,
} from "@/domain/dashboard";
import type { Weekday } from "@/domain/weeklyWindow";

interface DashboardEditScheduleModalProps {
  schedule: DashboardCardSchedule;
  cardTitle: string;
  onClose: () => void;
  onSave: (
    schedule: DashboardCardSchedule,
  ) => UpdateDashboardCardScheduleResult;
}

/**
 * Edits the weekly window of one saved dashboard card. The parent mounts a
 * fresh modal for each edit session so the draft always starts from the saved
 * schedule without synchronising derived state in an effect.
 */
export function DashboardEditScheduleModal({
  schedule,
  cardTitle,
  onClose,
  onSave,
}: DashboardEditScheduleModalProps) {
  const { t } = useTranslation();
  const [weekdays, setWeekdays] = useState<readonly Weekday[]>(
    schedule.weekdays,
  );
  const [startMinutes, setStartMinutes] = useState<number | null>(
    schedule.startMinutes,
  );
  const [endMinutes, setEndMinutes] = useState<number | null>(
    schedule.endMinutes,
  );
  const [saveError, setSaveError] = useState<"duplicate" | "failed" | null>(
    null,
  );

  const scheduleDraft = resolveDashboardCardScheduleDraft({
    weekdays,
    startMinutes,
    endMinutes,
  });
  const canSave = scheduleDraft.status === "complete";

  const clearSaveError = () => setSaveError(null);

  const handleSave = () => {
    if (scheduleDraft.status !== "complete") {
      return;
    }

    const result = onSave(scheduleDraft.schedule);
    if (result.ok) {
      onClose();
      return;
    }

    setSaveError(result.reason === "duplicate" ? "duplicate" : "failed");
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={t("dashboard.cards.editSchedule.title", { title: cardTitle })}
      centered
      size="lg"
    >
      <Stack gap={CONTENT_GAP}>
        <DashboardScheduleFields
          weekdays={weekdays}
          startMinutes={startMinutes}
          endMinutes={endMinutes}
          onWeekdaysChange={(value) => {
            clearSaveError();
            setWeekdays(value);
          }}
          onStartMinutesChange={(value) => {
            clearSaveError();
            setStartMinutes(value);
          }}
          onEndMinutesChange={(value) => {
            clearSaveError();
            setEndMinutes(value);
          }}
          labelWidth={FILTER_FIELD_LABEL_WIDTH}
        />

        {saveError ? (
          <Text c="red" fz="sm" role="alert">
            {t(`dashboard.cards.editSchedule.${saveError}`)}
          </Text>
        ) : null}

        <Group wrap="nowrap" gap={CONTENT_GAP}>
          <Button variant="default" flex={1} onClick={onClose}>
            {t("dashboard.cards.editSchedule.cancel")}
          </Button>
          <Button flex={1} disabled={!canSave} onClick={handleSave}>
            {t("dashboard.cards.editSchedule.save")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
