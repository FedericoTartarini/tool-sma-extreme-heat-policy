import {
  Combobox,
  Group,
  InputBase,
  Loader,
  Select,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { isSportType, sports, type SportType } from "@/domain/sport";
import { useMulticityLocationAdd } from "@/hooks/useMulticityLocationAdd";
import { useMulticityStore } from "@/store/multicityStore";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface MultiCityMainPanelProps {
  onAddError?: (
    reason: NonNullable<
      ReturnType<typeof useMulticityLocationAdd>["addErrorReason"]
    >,
  ) => void;
}

/**
 * Renders the main multi-city panel with title, inline sport filter, and add-location search.
 */
export function MultiCityMainPanel({ onAddError }: MultiCityMainPanelProps) {
  const { t } = useTranslation();
  const locationCombobox = useCombobox();
  const sport = useMulticityStore((state) => state.sport);
  const setSport = useMulticityStore((state) => state.setSport);
  const locations = useMulticityStore((state) => state.locations);
  const {
    locationSearchInput,
    locationSuggestions,
    isSuggestLoading,
    isAddingLocation,
    canAddMoreLocations,
    addErrorReason,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
  } = useMulticityLocationAdd();

  const sportOptions = useMemo<SelectOption<SportType>[]>(
    () =>
      sports.map((sportMeta) => ({
        value: sportMeta.type,
        label: t(sportMeta.labelKey),
      })),
    [t],
  );

  const handleSportChange = (value: string | null) => {
    if (value !== null && isSportType(value)) {
      setSport(value);
    }
  };

  const shouldRenderLocationDropdown = locationSuggestions.length > 0;
  const locationRightSection =
    isSuggestLoading || isAddingLocation ? (
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
    if (shouldRenderLocationDropdown) {
      locationCombobox.openDropdown();
    }
  }, [locationCombobox, shouldRenderLocationDropdown]);

  useEffect(() => {
    if (addErrorReason) {
      onAddError?.(addErrorReason);
    }
  }, [addErrorReason, onAddError]);

  const closeLocationDropdown = () => {
    locationCombobox.closeDropdown();
    locationCombobox.resetSelectedOption();
  };

  return (
    <SectionCard title={t("multicity.header.title")}>
      <Stack gap={CONTENT_GAP}>
        <Group wrap="wrap" align="center" gap="xs">
          <Text c="dimmed" fz={{ base: "md", sm: "lg" }}>
            {t("multicity.header.subtitlePrefix")}
          </Text>
          <Select
            aria-label={t("multicity.header.sportLabel")}
            size="md"
            data={sportOptions}
            value={sport}
            onChange={handleSportChange}
            searchable
            nothingFoundMessage={t("multicity.header.sportNotFound")}
            maw={280}
            flex={1}
            styles={{
              root: {
                flexGrow: 1,
                minWidth: 180,
                maxWidth: 320,
              },
            }}
          />
        </Group>

        <Stack gap="xs">
          <Text fw={600}>{t("multicity.addLocation.title")}</Text>
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
                aria-label={t("multicity.addLocation.inputLabel")}
                size="md"
                placeholder={t("multicity.addLocation.placeholder")}
                value={locationSearchInput}
                onChange={(event) => {
                  onLocationSearchInputChange(event.currentTarget.value);
                  locationCombobox.openDropdown();
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
                disabled={!canAddMoreLocations || isAddingLocation}
              />
            </Combobox.Target>

            {shouldRenderLocationDropdown ? (
              <Combobox.Dropdown>
                <Combobox.Options>{locationOptions}</Combobox.Options>
              </Combobox.Dropdown>
            ) : null}
          </Combobox>

          {!canAddMoreLocations ? (
            <Text c="dimmed" fz="sm">
              {t("multicity.errors.max_reached")}
            </Text>
          ) : null}
        </Stack>

        {locations.length === 0 ? (
          <Stack gap="xs">
            <Text fw={600}>{t("multicity.emptyState.title")}</Text>
            <Text c="dimmed">{t("multicity.emptyState.body")}</Text>
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
