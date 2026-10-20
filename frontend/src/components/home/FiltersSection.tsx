import { Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LocationSuggestField } from "@/components/filters/LocationSuggestField";
import { SportSelectField } from "@/components/filters/SportSelectField";
import { LocationFieldActionIcons } from "@/components/home/LocationFieldActionIcons";
import { SaveLocationModal } from "@/components/home/SaveLocationModal";
import { SportImagePreview } from "@/components/home/SportImagePreview";
import { SectionCard } from "@/components/ui/SectionCard";
import { CONTENT_GAP } from "@/config/uiLayout";
import { isSuggestionAlreadySaved } from "@/domain/savedLocation";
import { sports } from "@/domain/sport";
import {
  useHomeLocationSuggest,
  type LocationSuggestErrorReason,
} from "@/hooks/useHomeLocationSuggest";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

interface FiltersSectionProps {
  onLocationError?: (reason: LocationSuggestErrorReason) => void;
}

/**
 * Renders sport and location filters for Home risk calculation.
 */
export function FiltersSection({ onLocationError }: FiltersSectionProps) {
  const { t } = useTranslation();
  const [
    isSaveSavedLocationModalOpen,
    { open: openSaveSavedLocationModal, close: closeSaveSavedLocationModal },
  ] = useDisclosure(false);
  const sport = useHomeStore((state) => state.sport);
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const setSport = useHomeStore((state) => state.setSport);
  const savedLocations = useSavedLocationsStore(
    (state) => state.savedLocations,
  );
  const [failedSportImageUrl, setFailedSportImageUrl] = useState<string | null>(
    null,
  );

  const selectedSportMeta = useMemo(
    () => sports.find((sportMeta) => sportMeta.type === sport)!,
    [sport],
  );

  const selectedSportLabel = useMemo(
    () =>
      selectedSportMeta
        ? t(selectedSportMeta.labelKey)
        : t("home.sections.filters.selectedSportFallback"),
    [selectedSportMeta, t],
  );
  const sportImage = selectedSportMeta.image;

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
          isSuggestionSaved={(suggestion) =>
            isSuggestionAlreadySaved(savedLocations, suggestion)
          }
          locationFieldActions={
            <LocationFieldActionIcons
              canSaveCurrentLocation={selectedLocation !== null}
              hasSavedLocations={savedLocations.length > 0}
              onOpenSavedLocations={openSaveSavedLocationModal}
            />
          }
          onChange={onLocationSearchInputChange}
          onOptionSubmit={onLocationOptionSubmit}
        />

        <SportSelectField
          value={sport}
          onChange={(nextSport) => {
            setFailedSportImageUrl(null);
            setSport(nextSport);
          }}
        />

        <SportImagePreview
          image={sportImage}
          sportLabel={selectedSportLabel}
          failedImageUrl={failedSportImageUrl}
          onImageLoadFailure={setFailedSportImageUrl}
        />
      </Stack>
      <SaveLocationModal
        opened={isSaveSavedLocationModalOpen}
        onClose={closeSaveSavedLocationModal}
      />
    </SectionCard>
  );
}
