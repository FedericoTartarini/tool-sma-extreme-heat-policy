import {
  Box,
  Combobox,
  InputBase,
  Loader,
  Group,
  Select,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBookmarkFilled } from "@tabler/icons-react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LocationFieldActionIcons } from "@/components/home/LocationFieldActionIcons";
import { SaveLocationModal } from "@/components/home/SaveLocationModal";
import { SportImagePreview } from "@/components/home/SportImagePreview";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { isSuggestionAlreadySaved } from "@/domain/savedLocation";
import { isSportType, sports, type SportType } from "@/domain/sport";
import { useHomeLocationSuggest } from "@/hooks/useHomeLocationSuggest";
import type { HomeLocationErrorReason } from "@/domain/homeErrorMap";
import {
  getSportImageFailureUrl,
  type SportImageFailure,
} from "@/lib/sportImageFailure";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const FIELD_LABEL_WIDTH = 72;
const LOCATION_INPUT_CHEVRON_SECTION_WIDTH = 32;
const LOCATION_SUGGESTION_BOOKMARK_ICON_SIZE = 16;

interface FiltersSectionProps {
  onLocationError?: (reason: HomeLocationErrorReason) => void;
}

/**
 * Renders sport and location filters for Home risk calculation.
 */
export function FiltersSection({ onLocationError }: FiltersSectionProps) {
  const { t } = useTranslation();
  const locationCombobox = useCombobox();
  const [
    isSaveSavedLocationModalOpen,
    { open: openSaveSavedLocationModal, close: closeSaveSavedLocationModal },
  ] = useDisclosure(false);
  /*
  const profile = useHomeStore((state) => state.profile);
  const setProfile = useHomeStore((state) => state.setProfile);
  */
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const setSport = useHomeStore((state) => state.setSport);
  const savedLocations = useSavedLocationsStore(
    (state) => state.savedLocations,
  );
  const [sportImageFailure, setSportImageFailure] =
    useState<SportImageFailure | null>(null);

  /*
  const profileOptions = useMemo<SelectOption<HeatRiskProfile>[]>(
    () =>
      heatRiskProfiles.map((profileMeta) => ({
        value: profileMeta.type,
        label: t(profileMeta.labelKey),
      })),
    [t],
  );
  */
  const sportOptions = useMemo<SelectOption<SportType>[]>(
    () =>
      sports.map((sportMeta) => ({
        value: sportMeta.type,
        label: t(sportMeta.labelKey),
      })),
    [t],
  );

  const selectedSportMeta = useMemo(
    () => sports.find((sportMeta) => sportMeta.type === sport)!,
    [sport],
  );

  const selectedSportLabel = useMemo(
    () =>
      sportOptions.find((option) => option.value === sport)?.label ??
      t("home.sections.filters.selectedSportFallback"),
    [sport, sportOptions, t],
  );
  const sportImage = selectedSportMeta.image;
  const failedSportImageUrl = getSportImageFailureUrl(sportImageFailure, sport);

  const {
    locationSearchInput,
    locationSuggestions,
    isSuggestLoading,
    areSuggestionsCurrent,
    shouldOpenLocationDropdown,
    suggestErrorReason,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
    onLocationSearchSubmit,
  } = useHomeLocationSuggest();
  // Focusing a committed location hides its label so the user can type a new
  // search straight away; blurring without typing shows the label again.
  const [isLocationLabelHidden, setIsLocationLabelHidden] = useState(false);
  // Set when the user leaves the field without picking a suggestion.
  const [hasLeftLocationUnpicked, setHasLeftLocationUnpicked] = useState(false);
  // An empty search shows the current sport as placeholder, so typing filters
  // all sports instead of appending to the current sport's label.
  const [sportSearch, setSportSearch] = useState<string | null>(null);
  const isShowingCommittedLocation =
    selectedLocation !== null &&
    locationSearchInput === selectedLocation.displayLabel;
  const shouldShowLocationNotPicked =
    hasLeftLocationUnpicked && !isShowingCommittedLocation;
  const locationInputValue =
    isLocationLabelHidden && isShowingCommittedLocation
      ? ""
      : locationSearchInput;
  const locationPlaceholder =
    isLocationLabelHidden && selectedLocation
      ? selectedLocation.displayLabel
      : t("home.sections.filters.locationPlaceholder");
  const shouldRenderLocationDropdown = locationSuggestions.length > 0;
  const locationOptions = locationSuggestions.map((suggestion) => {
    const isSavedSuggestion = isSuggestionAlreadySaved(
      savedLocations,
      suggestion,
    );

    return (
      <Combobox.Option value={suggestion.id} key={suggestion.id}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text span fz="md" lineClamp={1} flex={1} miw={0}>
            {suggestion.displayLabel}
          </Text>
          {isSavedSuggestion ? (
            <Box
              component="span"
              role="img"
              c="brand"
              aria-label={t("home.savedLocations.suggestionSaved")}
            >
              <IconBookmarkFilled
                size={LOCATION_SUGGESTION_BOOKMARK_ICON_SIZE}
              />
            </Box>
          ) : null}
        </Group>
      </Combobox.Option>
    );
  });

  useEffect(() => {
    if (shouldOpenLocationDropdown && shouldRenderLocationDropdown) {
      locationCombobox.openDropdown();
    }
  }, [
    locationCombobox,
    shouldOpenLocationDropdown,
    shouldRenderLocationDropdown,
  ]);

  // Highlights the top suggestion once it matches the typed text, so Enter
  // picks it. The frame wait lets the dropdown mount its options first.
  // The store object is new on every render, but selectFirstOption is stable,
  // so re-renders do not undo the user's arrow-key choice.
  const isLocationDropdownOpened = locationCombobox.dropdownOpened;
  const { selectFirstOption } = locationCombobox;
  useEffect(() => {
    if (
      !isLocationDropdownOpened ||
      !areSuggestionsCurrent ||
      locationSuggestions.length === 0
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => selectFirstOption());
    return () => window.cancelAnimationFrame(frameId);
  }, [
    areSuggestionsCurrent,
    isLocationDropdownOpened,
    locationSuggestions,
    selectFirstOption,
  ]);

  useEffect(() => {
    if (suggestErrorReason) {
      onLocationError?.(suggestErrorReason);
    }
  }, [onLocationError, suggestErrorReason]);

  /*
  const handleProfileChange = (value: string | null) => {
    if (value !== null && isHeatRiskProfile(value)) {
      setProfile(value);
    }
  };
  */
  const closeLocationDropdown = () => {
    locationCombobox.closeDropdown();
    locationCombobox.resetSelectedOption();
  };

  const handleLocationInputFocus = () => {
    setIsLocationLabelHidden(isShowingCommittedLocation);

    if (shouldRenderLocationDropdown) {
      locationCombobox.openDropdown();
    }
  };

  const handleLocationInputChange = (value: string) => {
    setIsLocationLabelHidden(false);
    setHasLeftLocationUnpicked(false);
    // The highlight belonged to suggestions for the previous text.
    locationCombobox.resetSelectedOption();
    onLocationSearchInputChange(value);
    locationCombobox.openDropdown();
  };

  const handleLocationInputBlur = () => {
    setIsLocationLabelHidden(false);
    setHasLeftLocationUnpicked(!isShowingCommittedLocation);
    closeLocationDropdown();
  };

  const handleLocationInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    // keyCode 229 is the Enter that confirms an IME candidate (Safari reports
    // it after compositionend, so isComposing alone misses it).
    if (
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }

    const hasHighlightedOption =
      locationCombobox.dropdownOpened &&
      locationCombobox.getSelectedOptionIndex() !== -1;

    if (hasHighlightedOption) {
      // Mantine clicks the highlighted option only when `code` is "Enter".
      // Phone keyboards often send an empty code, so click it ourselves then.
      const { code } = event.nativeEvent;
      if (code !== "Enter" && code !== "NumpadEnter") {
        event.preventDefault();
        locationCombobox.clickSelectedOption();
      }
      return;
    }

    // Nothing highlighted yet: pick the top match for the typed text,
    // waiting for suggestions if needed.
    if (!isShowingCommittedLocation) {
      event.preventDefault();
      onLocationSearchSubmit();
    }
  };

  const handleSportChange = (value: string | null) => {
    // Picking a sport in the Select retries its image, even after an earlier failure.
    setSportImageFailure(null);

    if (value === null) {
      return;
    }

    if (isSportType(value)) {
      setSport(value);
    }
  };

  return (
    <SectionCard>
      <Stack gap={CONTENT_GAP}>
        {/*
        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
            {t("home.sections.filters.profileLabel")}:
          </Text>
          <Box flex={1}>
            <Select
              aria-label={t("home.sections.filters.profileLabel")}
              size="md"
              data={profileOptions}
              value={profile}
              onChange={handleProfileChange}
              searchable={false}
              allowDeselect={false}
            />
          </Box>
        </Group>
        */}
        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
            {t("home.sections.filters.locationLabel")}:
          </Text>
          <Group wrap="nowrap" align="center" gap="xs" flex={1} miw={0}>
            <Box flex={1} miw={0}>
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
                    placeholder={locationPlaceholder}
                    value={locationInputValue}
                    error={
                      shouldShowLocationNotPicked
                        ? t("home.sections.filters.locationNotPicked")
                        : undefined
                    }
                    onChange={(event) =>
                      handleLocationInputChange(event.currentTarget.value)
                    }
                    onFocus={handleLocationInputFocus}
                    onBlur={handleLocationInputBlur}
                    onKeyDown={handleLocationInputKeyDown}
                    onClick={() => {
                      if (shouldRenderLocationDropdown) {
                        locationCombobox.openDropdown();
                      }
                    }}
                    rightSection={
                      isSuggestLoading ? (
                        <Loader size={16} />
                      ) : (
                        <Combobox.Chevron size="md" />
                      )
                    }
                    rightSectionWidth={LOCATION_INPUT_CHEVRON_SECTION_WIDTH}
                    rightSectionPointerEvents="none"
                    autoComplete="off"
                  />
                </Combobox.Target>

                {shouldRenderLocationDropdown ? (
                  <Combobox.Dropdown>
                    <Combobox.Options>{locationOptions}</Combobox.Options>
                  </Combobox.Dropdown>
                ) : null}
              </Combobox>
            </Box>
            <LocationFieldActionIcons
              canSaveCurrentLocation={selectedLocation !== null}
              hasSavedLocations={savedLocations.length > 0}
              onOpenSavedLocations={openSaveSavedLocationModal}
              onCurrentLocationError={onLocationError}
            />
          </Group>
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
              value={sport}
              onChange={handleSportChange}
              searchable
              searchValue={sportSearch ?? selectedSportLabel}
              onSearchChange={setSportSearch}
              placeholder={selectedSportLabel}
              onFocus={() => setSportSearch("")}
              onOptionSubmit={() => setSportSearch(null)}
              selectFirstOptionOnChange
              nothingFoundMessage={t("home.sections.filters.sportNotFound")}
            />
          </Box>
        </Group>

        <SportImagePreview
          image={sportImage}
          sportLabel={selectedSportLabel}
          failedImageUrl={failedSportImageUrl}
          onImageLoadFailure={(url) => setSportImageFailure({ sport, url })}
        />
      </Stack>
      <SaveLocationModal
        opened={isSaveSavedLocationModalOpen}
        onClose={closeSaveSavedLocationModal}
      />
    </SectionCard>
  );
}
