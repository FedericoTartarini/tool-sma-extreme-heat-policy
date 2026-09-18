import { Button, Group, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

const REMOVE_SAVED_LOCATION_BUTTON_ICON_SIZE = 14;

interface SavedLocationChipsProps {
  isEditing?: boolean;
  onApplySavedLocation?: () => void;
}

/**
 * One-tap shortcuts for saved places (Issue #51 UI).
 * Applies stored coordinates — no new Mapbox search.
 * Delete is hidden until the user turns on edit, to avoid accidental taps.
 */
export function SavedLocationChips({
  isEditing = false,
  onApplySavedLocation,
}: SavedLocationChipsProps) {
  const { t } = useTranslation();
  // Newest first; do not re-sort in the UI.
  const savedLocations = useSavedLocationsStore(
    (state) => state.savedLocations,
  );
  const removeSavedLocation = useSavedLocationsStore(
    (state) => state.removeLocation,
  );
  const applySelectedLocation = useHomeStore((state) => state.selectLocation);
  const [removeErrorCode, setRemoveErrorCode] = useState<
    "storage_unavailable" | null
  >(null);

  if (savedLocations.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      <Group gap="xs">
        {savedLocations.map((savedLocation) => (
          <Button.Group key={savedLocation.id}>
            <Button
              variant="light"
              size="xs"
              disabled={isEditing}
              aria-label={t("home.savedLocations.apply", {
                label: savedLocation.label,
              })}
              onClick={() => {
                applySelectedLocation(savedLocation.location);
                onApplySavedLocation?.();
              }}
            >
              {savedLocation.label}
            </Button>
            {isEditing ? (
              <Button
                variant="light"
                size="xs"
                px="xs"
                aria-label={t("home.savedLocations.remove", {
                  label: savedLocation.label,
                })}
                onClick={() => {
                  const removeResult = removeSavedLocation(savedLocation.id);

                  if (removeResult.status === "rejected") {
                    setRemoveErrorCode(removeResult.reason);
                    return;
                  }

                  setRemoveErrorCode(null);
                }}
              >
                <IconX size={REMOVE_SAVED_LOCATION_BUTTON_ICON_SIZE} />
              </Button>
            ) : null}
          </Button.Group>
        ))}
      </Group>
      {/* The error belongs to the delete controls, so it leaves with them. */}
      {isEditing && removeErrorCode ? (
        <Text c="red" fz="sm">
          {t(`home.savedLocations.errors.${removeErrorCode}`)}
        </Text>
      ) : null}
    </Stack>
  );
}
