import { Button, Group } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

const REMOVE_SAVED_LOCATION_BUTTON_ICON_SIZE = 14;

/**
 * One-tap shortcuts for saved places (Issue #51 UI).
 * Applies stored coordinates — no new Mapbox search.
 */
export function SavedLocationChips() {
  const { t } = useTranslation();
  // Newest first; do not re-sort in the UI.
  const savedLocations = useSavedLocationsStore(
    (state) => state.savedLocations,
  );
  const removeSavedLocation = useSavedLocationsStore(
    (state) => state.removeLocation,
  );
  const applySelectedLocation = useHomeStore((state) => state.selectLocation);

  // Empty list → render nothing (no empty row).
  if (savedLocations.length === 0) {
    return null;
  }

  return (
    <Group gap="xs">
      {savedLocations.map((savedLocation) => (
        <Button.Group key={savedLocation.id}>
          <Button
            variant="light"
            size="xs"
            aria-label={t("home.savedLocations.apply", {
              label: savedLocation.label,
            })}
            // Snapshot already has lat/long → heat-risk refetch follows.
            onClick={() => applySelectedLocation(savedLocation.location)}
          >
            {savedLocation.label}
          </Button>
          <Button
            variant="light"
            size="xs"
            px="xs"
            aria-label={t("home.savedLocations.remove", {
              label: savedLocation.label,
            })}
            onClick={(event) => {
              // Stop bubble so delete does not also apply this location.
              event.stopPropagation();
              removeSavedLocation(savedLocation.id);
            }}
          >
            <IconX size={REMOVE_SAVED_LOCATION_BUTTON_ICON_SIZE} />
          </Button>
        </Button.Group>
      ))}
    </Group>
  );
}
