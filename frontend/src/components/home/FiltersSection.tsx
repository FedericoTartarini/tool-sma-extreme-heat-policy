import { Box, Image, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LocationSuggestField } from "@/components/filters/LocationSuggestField";
import { SportSelectField } from "@/components/filters/SportSelectField";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { sports, toSportAssetName } from "@/domain/sport";
import {
  useHomeLocationSuggest,
  type LocationSuggestErrorReason,
} from "@/hooks/useHomeLocationSuggest";
import { toPublicAssetUrl } from "@/lib/publicAssetUrl";
import { useHomeStore } from "@/store/homeStore";

const SPORT_IMAGE_HEIGHT = 104;

interface FiltersSectionProps {
  onLocationError?: (reason: LocationSuggestErrorReason) => void;
}

/**
 * Renders sport and location filters for Home risk calculation.
 */
export function FiltersSection({ onLocationError }: FiltersSectionProps) {
  const { t } = useTranslation();
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const setSport = useHomeStore((state) => state.setSport);
  const [hasSportImageError, setHasSportImageError] = useState(false);

  const selectedSportMeta = useMemo(
    () => sports.find((sportMeta) => sportMeta.type === sport),
    [sport],
  );

  const selectedSportLabel = useMemo(
    () =>
      selectedSportMeta
        ? t(selectedSportMeta.labelKey)
        : t("home.sections.filters.selectedSportFallback"),
    [selectedSportMeta, t],
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

  useEffect(() => {
    if (suggestErrorReason) {
      onLocationError?.(suggestErrorReason);
    }
  }, [onLocationError, suggestErrorReason]);

  return (
    <SectionCard>
      <Stack gap={CONTENT_GAP}>
        <LocationSuggestField
          value={locationSearchInput}
          suggestions={locationSuggestions}
          isLoading={isSuggestLoading}
          isCommitted={isShowingCommittedLocation}
          openDropdownWhenTyping
          enableSelectOnCommittedClick
          autoOpenWhenSuggestionsReady={shouldOpenLocationDropdown}
          onChange={onLocationSearchInputChange}
          onOptionSubmit={onLocationOptionSubmit}
        />

        <SportSelectField
          value={sport}
          onChange={(nextSport) => {
            setHasSportImageError(false);
            setSport(nextSport);
          }}
        />

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
