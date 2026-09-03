import { ActionIcon } from "@mantine/core";
import { IconBookmarkPlus, IconCurrentLocation } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const SAVE_SAVED_LOCATION_BUTTON_ICON_SIZE = 18;
const USE_MY_LOCATION_BUTTON_ICON_SIZE = 18;

interface LocationFieldActionIconsProps {
  isSaveDisabled: boolean;
  onSave: () => void;
}

/**
 * Use-my-location and Save controls for the Home location field (Issue #51 / #56).
 * Rendered outside the combobox so the input stays a standard Mantine field.
 */
export function LocationFieldActionIcons({
  isSaveDisabled,
  onSave,
}: LocationFieldActionIconsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Issue #56 placeholder — visual only, no geolocation yet. */}
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label={t("home.savedLocations.useMyLocationButton")}
      >
        <IconCurrentLocation size={USE_MY_LOCATION_BUTTON_ICON_SIZE} />
      </ActionIcon>
      <ActionIcon
        variant="light"
        color="brand"
        size="sm"
        aria-label={t("home.savedLocations.saveButton")}
        disabled={isSaveDisabled}
        onClick={onSave}
      >
        <IconBookmarkPlus size={SAVE_SAVED_LOCATION_BUTTON_ICON_SIZE} />
      </ActionIcon>
    </>
  );
}
