import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  SAVED_LOCATION_LABEL_MAX_LENGTH,
  SAVED_LOCATIONS_MAX,
  type SaveLocationRejectReason,
} from "@/domain/savedLocation";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

interface SaveLocationModalProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Collects a short label for the currently selected location and saves it.
 */
export function SaveLocationModal({ opened, onClose }: SaveLocationModalProps) {
  const { t } = useTranslation();
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const saveLocation = useSavedLocationsStore((state) => state.saveLocation);
  const [label, setLabel] = useState("");
  const [rejectReason, setRejectReason] =
    useState<SaveLocationRejectReason | null>(null);

  const closeAndReset = () => {
    setLabel("");
    setRejectReason(null);
    onClose();
  };

  const handleSubmit = () => {
    if (selectedLocation === null) {
      return;
    }

    const result = saveLocation({ label, location: selectedLocation });

    if (result.status === "rejected") {
      setRejectReason(result.reason);
      return;
    }

    closeAndReset();
  };

  return (
    <Modal
      opened={opened}
      onClose={closeAndReset}
      title={t("home.savedLocations.modalTitle")}
      centered
    >
      <Stack gap={CONTENT_GAP}>
        {selectedLocation ? (
          <Text c="dimmed" fz="sm">
            {selectedLocation.displayLabel}
          </Text>
        ) : null}
        <TextInput
          label={t("home.savedLocations.labelInput")}
          placeholder={t("home.savedLocations.labelPlaceholder")}
          value={label}
          maxLength={SAVED_LOCATION_LABEL_MAX_LENGTH}
          error={
            rejectReason
              ? t(`home.savedLocations.errors.${rejectReason}`, {
                  max: SAVED_LOCATIONS_MAX,
                })
              : null
          }
          onChange={(event) => {
            setLabel(event.currentTarget.value);
            setRejectReason(null);
          }}
          data-autofocus
        />
        <Group justify="flex-end" gap={CONTENT_GAP}>
          <Button variant="default" onClick={closeAndReset}>
            {t("home.savedLocations.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={selectedLocation === null}>
            {t("home.savedLocations.confirm")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
