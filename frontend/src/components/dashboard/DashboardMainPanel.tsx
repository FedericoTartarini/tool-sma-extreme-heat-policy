import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardScheduleFields } from "@/components/dashboard/DashboardScheduleFields";
import {
  FILTER_FIELD_LABEL_WIDTH,
  LocationSuggestField,
} from "@/components/filters/LocationSuggestField";
import { SportSelectField } from "@/components/filters/SportSelectField";
import { CONTENT_GAP } from "@/config/uiLayout";
import { MAX_DASHBOARD_CARDS } from "@/domain/dashboard";
import { useDashboardLocationAdd } from "@/hooks/useDashboardLocationAdd";
import { useDashboardStore } from "@/store/dashboardStore";

interface DashboardMainPanelProps {
  onAddError?: (
    reason: NonNullable<
      ReturnType<typeof useDashboardLocationAdd>["addErrorReason"]
    >,
  ) => void;
}

/**
 * Renders the add-card button, max-cards note, and modal add-card form.
 */
export function DashboardMainPanel({ onAddError }: DashboardMainPanelProps) {
  const { t } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const draftSport = useDashboardStore((state) => state.draftSport);
  const setDraftSport = useDashboardStore((state) => state.setDraftSport);
  const {
    locationSearchInput,
    locationSuggestions,
    isSuggestLoading,
    isResolvingLocation,
    isShowingCommittedDraftLocation,
    canAddMoreCards,
    canSubmitAdd,
    addErrorReason,
    draftWeekdays,
    draftStartMinutes,
    draftEndMinutes,
    onDraftWeekdaysChange,
    onDraftStartMinutesChange,
    onDraftEndMinutesChange,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
    onAddCardClick,
  } = useDashboardLocationAdd();
  const isAddFormDisabled = !canAddMoreCards || isResolvingLocation;

  const handleAddCardClick = () => {
    const failureReason = onAddCardClick();
    if (failureReason) {
      onAddError?.(failureReason);
      return;
    }
    setIsAddModalOpen(false);
  };

  return (
    <>
      <Stack gap={CONTENT_GAP}>
        <Button
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          disabled={!canAddMoreCards}
        >
          {t("dashboard.addLocation.openFormButton")}
        </Button>

        {!canAddMoreCards ? (
          <Text c="dimmed" fz="sm">
            {t("dashboard.errors.max_reached", {
              maxCards: MAX_DASHBOARD_CARDS,
            })}
          </Text>
        ) : null}
      </Stack>

      <Modal
        opened={isAddModalOpen && canAddMoreCards}
        onClose={() => setIsAddModalOpen(false)}
        title={t("dashboard.addLocation.modalTitle")}
        centered
        size="lg"
      >
        <Stack gap={CONTENT_GAP}>
          <LocationSuggestField
            value={locationSearchInput}
            suggestions={locationSuggestions}
            isLoading={isSuggestLoading || isResolvingLocation}
            disabled={isAddFormDisabled}
            isCommitted={isShowingCommittedDraftLocation}
            onChange={onLocationSearchInputChange}
            onOptionSubmit={onLocationOptionSubmit}
          />

          {addErrorReason ? (
            <Group wrap="nowrap" align="flex-start" gap={CONTENT_GAP}>
              <Box w={FILTER_FIELD_LABEL_WIDTH} visibleFrom="xs" />
              <Text c="red" fz="sm" flex={1}>
                {t(`dashboard.errors.${addErrorReason}`, {
                  maxCards: MAX_DASHBOARD_CARDS,
                })}
              </Text>
            </Group>
          ) : null}

          <SportSelectField
            value={draftSport}
            onChange={setDraftSport}
            disabled={isAddFormDisabled}
          />

          <DashboardScheduleFields
            weekdays={draftWeekdays}
            startMinutes={draftStartMinutes}
            endMinutes={draftEndMinutes}
            onWeekdaysChange={onDraftWeekdaysChange}
            onStartMinutesChange={onDraftStartMinutesChange}
            onEndMinutesChange={onDraftEndMinutesChange}
            labelWidth={FILTER_FIELD_LABEL_WIDTH}
            disabled={isAddFormDisabled}
          />

          <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
            <Box w={FILTER_FIELD_LABEL_WIDTH} visibleFrom="xs" />
            <Button
              flex={1}
              size="md"
              onClick={handleAddCardClick}
              disabled={!canSubmitAdd}
              loading={isResolvingLocation}
            >
              {t("dashboard.addLocation.addButton")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
