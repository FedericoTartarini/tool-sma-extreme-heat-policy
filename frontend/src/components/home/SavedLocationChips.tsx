import { Button, Group } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

const REMOVE_ICON_SIZE = 14;

/**
 * Renders saved locations as one-tap shortcuts that apply stored coordinates directly.
 */
export function SavedLocationChips() {
  const { t } = useTranslation();
  const savedLocations = useSavedLocationsStore(
    (state) => state.savedLocations,
  );
  const removeLocation = useSavedLocationsStore(
    (state) => state.removeLocation,
  );
  const selectLocation = useHomeStore((state) => state.selectLocation);

  if (savedLocations.length === 0) {
    return null;
  }

  return (
    <Group gap="xs">
      {savedLocations.map((saved) => (
        <Button.Group key={saved.id}>
          <Button
            variant="light"
            size="xs"
            aria-label={t("home.savedLocations.apply", { label: saved.label })}
            onClick={() => selectLocation(saved.location)}
          >
            {saved.label}
          </Button>
          <Button
            variant="light"
            size="xs"
            px="xs"
            aria-label={t("home.savedLocations.remove", {
              label: saved.label,
            })}
            onClick={(event) => {
              event.stopPropagation();
              removeLocation(saved.id);
            }}
          >
            <IconX size={REMOVE_ICON_SIZE} />
          </Button>
        </Button.Group>
      ))}
    </Group>
  );
}
