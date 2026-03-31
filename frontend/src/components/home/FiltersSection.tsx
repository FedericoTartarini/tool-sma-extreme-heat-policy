import {
  Autocomplete,
  Box,
  Group,
  Image,
  Loader,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isSportType,
  sports,
  toSportAssetName,
  type SportType,
} from "@/domain/sport";
import { CONTENT_GAP } from "@/config/uiLayout";
import { useHomeLocationSuggest } from "@/hooks/useHomeLocationSuggest";
import { useHomeStore } from "@/store/homeStore";
import { SectionCard } from "@/components/ui/SectionCard";
import { toPublicAssetUrl } from "@/lib/publicAssetUrl";

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const FIELD_LABEL_WIDTH = 72;
const SPORT_IMAGE_HEIGHT = 104;

/**
 * Renders sport and location filters for Home risk calculation.
 */
export function FiltersSection() {
  const { t } = useTranslation();
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const setSport = useHomeStore((state) => state.setSport);
  const [hasSportImageError, setHasSportImageError] = useState(false);

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
    suggestionLabels,
    isSuggestLoading,
    onLocationSearchInputChange,
    onLocationOptionSubmit,
  } = useHomeLocationSuggest();
  const isShowingCommittedLocation =
    selectedLocation !== null &&
    locationSearchInput === selectedLocation.formattedLocation;

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
        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Text fw={600} w={FIELD_LABEL_WIDTH} ta="right">
            {t("home.sections.filters.locationLabel")}:
          </Text>
          <Box flex={1}>
            <Autocomplete
              aria-label={t("home.sections.filters.locationLabel")}
              size="md"
              placeholder={t("home.sections.filters.locationPlaceholder")}
              value={locationSearchInput}
              onChange={onLocationSearchInputChange}
              onOptionSubmit={onLocationOptionSubmit}
              onClick={(event) => {
                if (isShowingCommittedLocation) {
                  event.currentTarget.select();
                }
              }}
              data={suggestionLabels}
              filter={({ options }) => options}
              clearable={false}
              rightSection={isSuggestLoading ? <Loader size={16} /> : undefined}
              autoComplete="off"
            />
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
