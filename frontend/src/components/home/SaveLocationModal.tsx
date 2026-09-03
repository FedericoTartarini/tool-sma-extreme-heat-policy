import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SavedLocationChips } from "@/components/home/SavedLocationChips";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  SAVED_LOCATION_LABEL_MAX_LENGTH as MAX_SAVED_LOCATION_NAME_CHARACTER_COUNT,
  SAVED_LOCATIONS_MAX as MAX_SAVED_LOCATION_COUNT,
  type SaveLocationRejectReason as SaveLocationValidationErrorCode,
} from "@/domain/savedLocation";
import { useHomeStore } from "@/store/homeStore";
import { useSavedLocationsStore } from "@/store/savedLocationsStore";

interface SaveLocationModalProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Save-location dialog (Issue #51 UI).
 * Asks for a short label, then calls the shared store — no API call here.
 */
export function SaveLocationModal({ opened, onClose }: SaveLocationModalProps) {
  const { t } = useTranslation();
  // Must already include coordinates, otherwise the store rejects the save.
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const saveLocationToStore = useSavedLocationsStore(
    (state) => state.saveLocation,
  );
  const savedLocations = useSavedLocationsStore(
    (state) => state.savedLocations,
  );
  const [savedLocationNameInput, setSavedLocationNameInput] = useState("");
  const [validationErrorCode, setValidationErrorCode] =
    useState<SaveLocationValidationErrorCode | null>(null);
  const [isEditingSavedLocations, setIsEditingSavedLocations] = useState(false);

  const closeModalAndClearForm = () => {
    setSavedLocationNameInput("");
    setValidationErrorCode(null);
    setIsEditingSavedLocations(false);
    onClose();
  };

  const handleSubmit = () => {
    if (selectedLocation === null) {
      return;
    }

    // Store returns saved | rejected — never throws.
    const saveResult = saveLocationToStore({
      label: savedLocationNameInput,
      location: selectedLocation,
    });

    if (saveResult.status === "rejected") {
      // Machine code → i18n key, e.g. errors.duplicate_label
      setValidationErrorCode(saveResult.reason);
      return;
    }

    closeModalAndClearForm();
  };

  return (
    <Modal
      opened={opened}
      onClose={closeModalAndClearForm}
      title={t("home.savedLocations.modalTitle")}
      centered
    >
      <Stack gap={CONTENT_GAP}>
        {selectedLocation ? (
          <Text fz="sm">
            {t("home.savedLocations.savingLocationIntro", {
              location: selectedLocation.displayLabel,
            })}
          </Text>
        ) : null}
        <TextInput
          label={t("home.savedLocations.labelInput")}
          placeholder={t("home.savedLocations.labelPlaceholder")}
          value={savedLocationNameInput}
          // Soft cap in the input; store also truncates to 20 characters.
          maxLength={MAX_SAVED_LOCATION_NAME_CHARACTER_COUNT}
          error={
            validationErrorCode
              ? t(`home.savedLocations.errors.${validationErrorCode}`, {
                  max: MAX_SAVED_LOCATION_COUNT,
                })
              : null
          }
          onChange={(event) => {
            setSavedLocationNameInput(event.currentTarget.value);
            setValidationErrorCode(null);
          }}
          data-autofocus
        />
        <Stack gap="xs">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text fw={500} fz="sm">
              {t("home.savedLocations.savedListTitle")}
            </Text>
            {savedLocations.length > 0 ? (
              <Button
                variant="subtle"
                size="xs"
                onClick={() =>
                  setIsEditingSavedLocations(
                    (isCurrentlyEditing) => !isCurrentlyEditing,
                  )
                }
              >
                {isEditingSavedLocations
                  ? t("home.savedLocations.doneEditing")
                  : t("home.savedLocations.edit")}
              </Button>
            ) : null}
          </Group>
          <SavedLocationChips
            isEditing={isEditingSavedLocations}
            onApplySavedLocation={closeModalAndClearForm}
          />
          {savedLocations.length > 0 ? (
            <Text c="dimmed" fz="xs">
              {t(
                isEditingSavedLocations
                  ? "home.savedLocations.chipHintEditing"
                  : "home.savedLocations.chipHint",
              )}
            </Text>
          ) : null}
        </Stack>
        <Group justify="flex-end" gap={CONTENT_GAP}>
          <Button variant="default" onClick={closeModalAndClearForm}>
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
