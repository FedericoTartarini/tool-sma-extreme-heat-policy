import {
  Box,
  Button,
  Combobox,
  Group,
  InputBase,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardScheduleFields } from "@/components/dashboard/DashboardScheduleFields";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";
import { MAX_DASHBOARD_CARDS } from "@/domain/dashboard";
import { isSportType, sports, type SportType } from "@/domain/sport";
import { useDashboardLocationAdd } from "@/hooks/useDashboardLocationAdd";
import { useDashboardStore } from "@/store/dashboardStore";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const FIELD_LABEL_WIDTH = 72;

interface DashboardMainPanelProps {
  onAddError?: (
    reason: NonNullable<
      ReturnType<typeof useDashboardLocationAdd>["addErrorReason"]
    >,
  ) => void;
}

/**
 * Renders the dashboard header, empty state, and modal add-card form.
 */
export function DashboardMainPanel({ onAddError }: DashboardMainPanelProps) {
  const { t } = useTranslation();
  const locationCombobox = useCombobox();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const draftSport = useDashboardStore((state) => state.draftSport);
  const setDraftSport = useDashboardStore((state) => state.setDraftSport);
  const cards = useDashboardStore((state) => state.cards);
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

  const sportOptions = useMemo<SelectOption<SportType>[]>(
    () =>
      sports.map((sportMeta) => ({
        value: sportMeta.type,
        label: t(sportMeta.labelKey),
      })),
    [t],
  );

  const shouldRenderLocationDropdown =
    !isShowingCommittedDraftLocation && locationSuggestions.length > 0;
  const locationRightSection =
    isSuggestLoading || isResolvingLocation ? (
      <Loader size={16} />
    ) : (
      <Combobox.Chevron size="md" />
    );
  const locationOptions = locationSuggestions.map((suggestion) => (
    <Combobox.Option value={suggestion.id} key={suggestion.id}>
      {suggestion.displayLabel}
    </Combobox.Option>
  ));

  useEffect(() => {
    if (addErrorReason) {
      onAddError?.(addErrorReason);
    }
  }, [addErrorReason, onAddError]);

  const closeLocationDropdown = () => {
    locationCombobox.closeDropdown();
    locationCombobox.resetSelectedOption();
  };

  const handleSportChange = (value: string | null) => {
    if (value !== null && isSportType(value)) {
      setDraftSport(value);
    }
  };

  const handleAddCardClick = () => {
    const cardCountBeforeAdd = useDashboardStore.getState().cards.length;
    onAddCardClick();
    const cardCountAfterAdd = useDashboardStore.getState().cards.length;

    if (cardCountAfterAdd > cardCountBeforeAdd) {
      setIsAddModalOpen(false);
    }
  };

  const descriptionLines = t("dashboard.header.description", {
    maxCards: MAX_DASHBOARD_CARDS,
  }).split("\n");

  return (
    <>
      <SectionCard
        title={t("dashboard.header.title")}
        subtitle={
          <Stack gap={0}>
            {descriptionLines.map((line, index) => (
              <Text
                key={index}
                c="dimmed"
                fz={{ base: "md", sm: "lg" }}
                lh={RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT}
              >
                {line}
              </Text>
            ))}
          </Stack>
        }
      >
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

          {cards.length === 0 ? (
            <Text fw={600}>{t("dashboard.emptyState.title")}</Text>
          ) : null}
        </Stack>
      </SectionCard>

      <Modal
        opened={isAddModalOpen && canAddMoreCards}
        onClose={() => setIsAddModalOpen(false)}
        title={t("dashboard.addLocation.modalTitle")}
        centered
        size="lg"
      >
        <Stack gap={CONTENT_GAP}>
          <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
            <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
              {t("home.sections.filters.locationLabel")}:
            </Text>
            <Box flex={1}>
              <Combobox
                store={locationCombobox}
                onOptionSubmit={(value) => {
                  onLocationOptionSubmit(value);
                  closeLocationDropdown();
                }}
                size="md"
              >
                <Combobox.Target targetType="input">
                  <InputBase
                    __staticSelector="Select"
                    aria-label={t("home.sections.filters.locationLabel")}
                    size="md"
                    placeholder={t("home.sections.filters.locationPlaceholder")}
                    value={locationSearchInput}
                    onChange={(event) => {
                      onLocationSearchInputChange(event.currentTarget.value);
                      if (!isShowingCommittedDraftLocation) {
                        locationCombobox.openDropdown();
                      }
                    }}
                    onFocus={() => {
                      if (shouldRenderLocationDropdown) {
                        locationCombobox.openDropdown();
                      }
                    }}
                    onBlur={closeLocationDropdown}
                    rightSection={locationRightSection}
                    rightSectionPointerEvents="none"
                    autoComplete="off"
                    disabled={isAddFormDisabled}
                  />
                </Combobox.Target>

                {shouldRenderLocationDropdown ? (
                  <Combobox.Dropdown>
                    <Combobox.Options>{locationOptions}</Combobox.Options>
                  </Combobox.Dropdown>
                ) : null}
              </Combobox>
            </Box>
          </Group>

          <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
            <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
              {t("home.sections.filters.sportLabel")}:
            </Text>
            <Box flex={1}>
              <Select
                aria-label={t("home.sections.filters.sportLabel")}
                size="md"
                data={sportOptions}
                value={draftSport}
                onChange={handleSportChange}
                searchable
                nothingFoundMessage={t("home.sections.filters.sportNotFound")}
                disabled={isAddFormDisabled}
              />
            </Box>
          </Group>

          <DashboardScheduleFields
            weekdays={draftWeekdays}
            startMinutes={draftStartMinutes}
            endMinutes={draftEndMinutes}
            onWeekdaysChange={onDraftWeekdaysChange}
            onStartMinutesChange={onDraftStartMinutesChange}
            onEndMinutesChange={onDraftEndMinutesChange}
            labelWidth={FIELD_LABEL_WIDTH}
            disabled={isAddFormDisabled}
          />

          <Group wrap="nowrap" align="flex-start" gap={CONTENT_GAP}>
            <Box w={FIELD_LABEL_WIDTH} visibleFrom="xs" />
            <Text c="dimmed" fz="sm" flex={1}>
              {t("dashboard.addLocation.scheduleRequired")}
            </Text>
          </Group>

          <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
            <Box w={FIELD_LABEL_WIDTH} visibleFrom="xs" />
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
