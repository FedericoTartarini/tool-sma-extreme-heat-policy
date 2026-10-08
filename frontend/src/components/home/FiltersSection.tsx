import { Box, Grid, Select, Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LocationFieldActionIcons,
  type LocationFieldActionIconsProps,
} from "@/components/home/LocationFieldActionIcons";
import {
  SaveLocationModal,
  type SaveLocationModalHandlers,
} from "@/components/home/SaveLocationModal";
import { SavedLocationChips } from "@/components/home/SavedLocationChips";
import {
  sportAssets,
  type SportDisplayAsset,
} from "@/domain/sportDisplayAssets";
import { DEFAULT_HEAT_RISK_PROFILE } from "@/domain/heatRiskProfile";
import { isSportType, sports, type SportType } from "@/domain/sport";
import {
  useHomeLocationSuggest,
  type LocationSuggestErrorReason,
} from "@/hooks/useHomeLocationSuggest";
import { toPublicAssetUrl } from "@/lib/publicAssetUrl";
import {
  useHomeCurrentLocation,
  type HomeCurrentLocationErrorReason,
} from "@/hooks/useHomeCurrentLocation";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";
import { Combobox, ComboboxChevron } from "@/components/ui/Combobox";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { appBreakpoints } from "@/config/uiBreakpoints";
import type { HomeLocationErrorReason } from "@/domain/homeErrorMap";

type SportOption = {
  value: SportType;
  asset: SportDisplayAsset;
};

const SPORT_OPTIONS: SportOption[] = sports
  .filter((sportType): sportType is NonNullable<SportType> =>
    isSportType(sportType),
  )
  .map((sportType) => ({
    value: sportType,
    asset: sportAssets(sportType),
  }));

const PROFILE_OPTIONS = Object.freeze([
  {
    value: "GENERAL",
    labelKey: "home.filters.profiles.general",
  },
  {
    value: "AGE_14_17",
    labelKey: "home.filters.profiles.age1417",
  },
  {
    value: "AGE_18_PLUS",
    labelKey: "home.filters.profiles.age18Plus",
  },
] as const);

const GRID_SPACING = "md";

export type HomeFiltersSectionSaveLocationModalHandlers =
  SaveLocationModalHandlers;

export interface HomeFiltersSectionProps {
  onLocationError?: (reason: HomeLocationErrorReason) => void;
  onCalculationError?: (reason: unknown) => void;
  saveLocationModalHandlers: HomeFiltersSectionSaveLocationModalHandlers;
}

/**
 * Top-of-page filter grid for the Home page: profile, sport, and the location
 * combobox with the Issue #56 auto-detect crosshair and the Issue #51
 * saved-locations bookmark.
 */
export function FiltersSection({
  onLocationError,
  onCalculationError,
  saveLocationModalHandlers,
}: HomeFiltersSectionProps) {
  const { t } = useTranslation();
  const profile = useHomeStore((state) => state.profile);
  const sport = useHomeStore((state) => state.sport);
  const setProfile = useHomeStore((state) => state.setProfile);
  const setSport = useHomeStore((state) => state.setSport);
  const [isEditingSavedLocations, setIsEditingSavedLocations] = useState(false);
  const savedLocations = useSavedLocationsStore(
    (state) => state.savedLocations,
  );
  const canSaveCurrentLocation = useHomeStore(
    (state) => state.selectedLocation !== null,
  );
  const hasSavedLocations = savedLocations.length > 0;

  const {
    locationSuggestions,
    locationSearchInput,
    locationSuggestIsLoading,
    selectedLocation,
    prefilledLocationResolveState,
    onLocationSearchInputChange,
    onLocationSuggestionSelected,
    onLocationInputBlur,
    isLocationDropdownOpen,
    setIsLocationDropdownOpen,
    activeSuggestionIndex,
    onComboboxKeydown,
  } = useHomeLocationSuggest({
    onSuggestError: (reason: LocationSuggestErrorReason) =>
      onLocationError?.(reason),
  });

  const onCurrentLocationError: LocationFieldActionIconsProps["onCurrentLocationError"] =
    (reason: HomeCurrentLocationErrorReason) => onLocationError?.(reason);
  const { requestCurrentLocation } = useHomeCurrentLocation();

  const profileOptions = useMemo(
    () =>
      PROFILE_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    [t],
  );
  const sportOptions = useMemo(
    () =>
      SPORT_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.asset.labelKey),
      })),
    [t],
  );
  const { isFetching } = useHomeHeatRisk({
    onError: (reason) => onCalculationError?.(reason),
  });

  return (
    <Stack gap="xs">
      <Grid gutter={GRID_SPACING}>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }} order={{ base: 2, md: 1 }}>
          <Select
            label={t("home.filters.profile.label")}
            data={profileOptions}
            value={profile === DEFAULT_HEAT_RISK_PROFILE ? null : profile}
            placeholder={t("home.filters.profile.placeholder")}
            allowDeselect={false}
            checkIconPosition="right"
            rightSection={<ComboboxChevron />}
            comboboxProps={{ transitionProps: { transition: "pop", duration: 120 } }}
            onChange={(value) => value && setProfile(value as typeof profile)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }} order={{ base: 3, md: 2 }}>
          <Select
            label={t("home.filters.sport.label")}
            data={sportOptions}
            value={sport}
            placeholder={t("home.filters.sport.placeholder")}
            allowDeselect={false}
            checkIconPosition="right"
            rightSection={<ComboboxChevron />}
            comboboxProps={{ transitionProps: { transition: "pop", duration: 120 } }}
            leftSection={
              sport ? (
                <img
                  src={toPublicAssetUrl(sportAssets(sport).image.filename)}
                  alt=""
                  aria-hidden
                  width={20}
                  height={20}
                  style={{ objectFit: "contain" }}
                />
              ) : undefined
            }
            onChange={(value) => value && isSportType(value) && setSport(value)}
          />
        </Grid.Col>
        <Grid.Col
          span={{ base: 12, md: 4 }}
          order={{ base: 1, md: 3 }}
          visibleFrom={appBreakpoints.mobile.max ?? undefined}
        >
          <Box aria-hidden c="transparent" fz="xs" lh={1.2}>
            &nbsp;
          </Box>
          <Combobox
            label={t("home.filters.location.label")}
            placeholder={t("home.filters.location.placeholder")}
            value={locationSearchInput}
            data={locationSuggestions}
            onChange={onLocationSearchInputChange}
            onOptionSubmit={(value) => {
              const suggestion = locationSuggestions.find(
                (suggestion) => suggestion.value === value,
              );
              if (suggestion) {
                onLocationSuggestionSelected(suggestion);
              }
            }}
            onBlur={onLocationInputBlur}
            onDropdownOpen={setIsLocationDropdownOpen}
            onDropdownClose={() => setIsLocationDropdownOpen(false)}
            isLoading={locationSuggestIsLoading || isFetching}
            dropdownOpened={isLocationDropdownOpen}
            onComboboxKeydown={onComboboxKeydown}
            activeOptionIndex={activeSuggestionIndex}
            inputValue={selectedLocation?.displayLabel ?? undefined}
            selectedValue={
              selectedLocation
                ? {
                    id: selectedLocation.id,
                    displayLabel: selectedLocation.displayLabel,
                    name: selectedLocation.name,
                  }
                : undefined
            }
            selectedValuePrefillState={prefilledLocationResolveState}
            section="location"
            icon={<LocationFieldActionIcons
              canSaveCurrentLocation={canSaveCurrentLocation}
              hasSavedLocations={hasSavedLocations}
              onOpenSavedLocations={() =>
                setIsEditingSavedLocations((state) => !state)
              }
              onCurrentLocationError={onCurrentLocationError}
            />}
          />
        </Grid.Col>
        <Grid.Col
          span={{ base: 12, md: 4 }}
          order={{ base: 1, md: 3 }}
          hiddenFrom={appBreakpoints.mobile.max ?? undefined}
        >
          <Combobox
            label={t("home.filters.location.label")}
            placeholder={t("home.filters.location.placeholder")}
            value={locationSearchInput}
            data={locationSuggestions}
            onChange={onLocationSearchInputChange}
            onOptionSubmit={(value) => {
              const suggestion = locationSuggestions.find(
                (suggestion) => suggestion.value === value,
              );
              if (suggestion) {
                onLocationSuggestionSelected(suggestion);
              }
            }}
            onBlur={onLocationInputBlur}
            onDropdownOpen={setIsLocationDropdownOpen}
            onDropdownClose={() => setIsLocationDropdownOpen(false)}
            isLoading={locationSuggestIsLoading || isFetching}
            dropdownOpened={isLocationDropdownOpen}
            onComboboxKeydown={onComboboxKeydown}
            activeOptionIndex={activeSuggestionIndex}
            inputValue={selectedLocation?.displayLabel ?? undefined}
            selectedValue={
              selectedLocation
                ? {
                    id: selectedLocation.id,
                    displayLabel: selectedLocation.displayLabel,
                    name: selectedLocation.name,
                  }
                : undefined
            }
            selectedValuePrefillState={prefilledLocationResolveState}
            section="location"
            icon={<LocationFieldActionIcons
              canSaveCurrentLocation={canSaveCurrentLocation}
              hasSavedLocations={hasSavedLocations}
              onOpenSavedLocations={() =>
                setIsEditingSavedLocations((state) => !state)
              }
              onCurrentLocationError={onCurrentLocationError}
              requestCurrentLocationOverride={requestCurrentLocation}
            />}
          />
        </Grid.Col>
      </Grid>
      <SaveLocationModal
        {...saveLocationModalHandlers}
        hasSavedLocations={hasSavedLocations}
        canSaveCurrentLocation={canSaveCurrentLocation}
      />
      {hasSavedLocations ? (
        <SavedLocationChips isEditing={isEditingSavedLocations} />
      ) : null}
    </Stack>
  );
}