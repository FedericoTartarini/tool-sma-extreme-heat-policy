import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SavedLocationChips } from "@/components/home/SavedLocationChips";
import { BUTTON_HEIGHT_XS, CONTENT_GAP } from "@/config/uiLayout";
import {
  normalizeLabel,
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
    useState<SaveLocationRejectReason | null>(null);
  const [isEditingSavedLocations, setIsEditingSavedLocations] = useState(false);

  // One rule for both footer decisions: Close vs Cancel wording and Save's disabled state.
  const isNameEmpty = normalizeLabel(savedLocationNameInput) === "";

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
      title={
        selectedLocation
          ? t("home.savedLocations.modalTitle")
          : t("home.savedLocations.savedListTitle")
      }
      centered
    >
      <Stack gap={CONTENT_GAP}>
        {selectedLocation ? (
          <>
            <Stack gap={4}>
              <Text fw={600} fz="md">
                {selectedLocation.displayLabel}
              </Text>
              <Text c="dimmed" fz="sm">
                {t("home.savedLocations.savingLocationNameHint")}
              </Text>
            </Stack>
            <TextInput
              label={t("home.savedLocations.labelInput")}
              placeholder={t("home.savedLocations.labelPlaceholder")}
              value={savedLocationNameInput}
              // Soft cap in the input; store also truncates to 20 characters.
              maxLength={SAVED_LOCATION_LABEL_MAX_LENGTH}
              // Editing the list and naming a new entry are separate tasks.
              disabled={isEditingSavedLocations}
              error={
                validationErrorCode
                  ? t(`home.savedLocations.errors.${validationErrorCode}`, {
                      max: SAVED_LOCATIONS_MAX,
                    })
                  : null
              }
              onChange={(event) => {
                setSavedLocationNameInput(event.currentTarget.value);
                setValidationErrorCode(null);
              }}
              data-autofocus
            />
          </>
        ) : null}
        <Stack gap="xs">
          <Group
            justify={selectedLocation ? "space-between" : "flex-end"}
            align="center"
            wrap="nowrap"
            // Reserve the Edit button's height so the dialog does not jump when it hides.
            mih={BUTTON_HEIGHT_XS}
          >
            {selectedLocation ? (
              <Text fw={500} fz="sm">
                {t("home.savedLocations.savedListTitle")}
              </Text>
            ) : null}
            {savedLocations.length > 0 && !isEditingSavedLocations ? (
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  // Removing an entry may resolve a duplicate_label error, so drop it.
                  setValidationErrorCode(null);
                  setIsEditingSavedLocations(true);
                }}
              >
                {t("home.savedLocations.edit")}
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
          {isEditingSavedLocations ? (
            // Removals persist immediately, so the only way out of edit mode is "Done".
            <Button onClick={() => setIsEditingSavedLocations(false)}>
              {t("home.savedLocations.doneEditing")}
            </Button>
          ) : (
            <>
              <Button variant="default" onClick={closeModalAndClearForm}>
                {/* Typed text is discarded on close, so say Cancel while there is any. */}
                {isNameEmpty
                  ? t("home.savedLocations.close")
                  : t("home.savedLocations.cancel")}
              </Button>
              {selectedLocation ? (
                <Button onClick={handleSubmit} disabled={isNameEmpty}>
                  {t("home.savedLocations.confirm")}
                </Button>
              ) : null}
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
