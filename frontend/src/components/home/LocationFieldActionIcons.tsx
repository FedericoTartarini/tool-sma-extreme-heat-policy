import { ActionIcon, Text } from "@mantine/core";
import { IconBookmarkPlus, IconCurrentLocation } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const ACTION_ICON_SIZE = 18;

interface LocationFieldActionIconsProps {
  canSaveCurrentLocation: boolean;
  hasSavedLocations: boolean;
  onOpenSavedLocations: () => void;
}

/**
 * Use-my-location and Save controls for the Home location field (Issue #51 / #56).
 * Rendered outside the combobox so the input stays a standard Mantine field.
 *
 * The bookmark is the only entry point to the saved-location dialog, so it stays
 * enabled whenever there is something to save or something already saved.
 */
export function LocationFieldActionIcons({
  canSaveCurrentLocation,
  hasSavedLocations,
  onOpenSavedLocations,
}: LocationFieldActionIconsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Issue #56 placeholder — layout only until geolocation is wired. */}
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        disabled
        aria-label={t("home.savedLocations.useMyLocationButton")}
      >
        <IconCurrentLocation size={ACTION_ICON_SIZE} />
      </ActionIcon>
      <Text c="dimmed" fz="sm" aria-hidden>
        |
      </Text>
      <ActionIcon
        variant="light"
        color="brand"
        size="sm"
        aria-label={
          canSaveCurrentLocation
            ? t("home.savedLocations.saveButton")
            : t("home.savedLocations.openSavedLocations")
        }
        disabled={!canSaveCurrentLocation && !hasSavedLocations}
        onClick={onOpenSavedLocations}
      >
        <IconBookmarkPlus size={ACTION_ICON_SIZE} />
      </ActionIcon>
    </>
  );
}
