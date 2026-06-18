import {
  Box,
  Combobox,
  Image,
  InputBase,
  Loader,
  Group,
  Select,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isSportType,
  sports,
  toSportAssetName,
  type SportType,
} from "@/domain/sport";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  useHomeLocationSuggest,
  type LocationSuggestErrorReason,
} from "@/hooks/useHomeLocationSuggest";
import { useHomeStore } from "@/store/homeStore";
import { SectionCard } from "@/components/ui/SectionCard";
import { toPublicAssetUrl } from "@/lib/publicAssetUrl";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const FIELD_LABEL_WIDTH = 72;
const SPORT_IMAGE_HEIGHT = 104;

interface FiltersSectionProps {
  onLocationError?: (reason: LocationSuggestErrorReason) => void;
}

/**
 * Renders sport and location filters for Home risk calculation.
 */
export function FiltersSection({ onLocationError }: FiltersSectionProps) {
  const { t } = useTranslation();
  const locationCombobox = useCombobox();
  /*
  const profile = useHomeStore((state) => state.profile);
  const setProfile = useHomeStore((state) => state.setProfile);
  */
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const setSport = useHomeStore((state) => state.setSport);
  const [hasSportImageError, setHasSportImageError] = useState(false);

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
    () => sports.find((sportMeta) => sportMeta.type === sport),
    [sport],
  );

  const selectedSportLabel = useMemo(
    () =>
      sportOptions.find((option) => option.value === sport)?.label ??
      t("home.sections.filters.selectedSportFallback"),
    [sport, sportOptions, t],
  );
  const sportImageSrc =
    selectedSportMeta?.imagePath ??
    toPublicAssetUrl(`sports/${toSportAssetName(sport)}.webp`);

  const {
    locationSearchInput,
    locationSuggestions,
    isSuggestLoading,
    shouldOpenLocationDropdown,
    suggestErrorReason,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
  } = useHomeLocationSuggest();
  const isShowingCommittedLocation =
    selectedLocation !== null &&
    locationSearchInput === selectedLocation.displayLabel;
  const shouldRenderLocationDropdown = locationSuggestions.length > 0;
  const locationRightSection = isSuggestLoading ? (
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
    if (shouldOpenLocationDropdown && shouldRenderLocationDropdown) {
      locationCombobox.openDropdown();
    }
  }, [
    locationCombobox,
    shouldOpenLocationDropdown,
    shouldRenderLocationDropdown,
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
  const handleLocationInputClick = (event: MouseEvent<HTMLInputElement>) => {
    if (isShowingCommittedLocation) {
      event.currentTarget.select();
    }

    if (shouldRenderLocationDropdown) {
      locationCombobox.openDropdown();
    }
  };

  const closeLocationDropdown = () => {
    locationCombobox.closeDropdown();
    locationCombobox.resetSelectedOption();
  };

  const handleSportChange = (value: string | null) => {
    setHasSportImageError(false);

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
                    locationCombobox.openDropdown();
                  }}
                  onFocus={() => {
                    if (shouldRenderLocationDropdown) {
                      locationCombobox.openDropdown();
                    }
                  }}
                  onBlur={closeLocationDropdown}
                  onClick={handleLocationInputClick}
                  rightSection={locationRightSection}
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
              nothingFoundMessage={t("home.sections.filters.sportNotFound")}
            />
          </Box>
        </Group>

        <Box h={SPORT_IMAGE_HEIGHT}>
          {!hasSportImageError ? (
            <Image
              src={sportImageSrc}
              alt={t("home.sections.filters.sportImageAlt", {
                sportLabel: selectedSportLabel,
              })}
              w="100%"
              h={SPORT_IMAGE_HEIGHT}
              radius="sm"
              onError={() => setHasSportImageError(true)}
            />
          ) : (
            <Stack
              align="center"
              justify="center"
              gap={CONTENT_GAP}
              h="100%"
              px={CONTENT_GAP}
            >
              <Text fw={500} fz="sm">
                {t("home.sections.filters.sportImageUnavailable")}
              </Text>
              <Text c="dimmed" fz="xs" ta="center">
                {t("home.sections.filters.sportImageHelp", {
                  sportLabel: selectedSportLabel,
                  path: sportImageSrc,
                })}
              </Text>
            </Stack>
          )}
        </Box>
      </Stack>
    </SectionCard>
  );
}
