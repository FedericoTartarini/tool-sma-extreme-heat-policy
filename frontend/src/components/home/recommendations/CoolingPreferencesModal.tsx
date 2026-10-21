import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import {
  ACTIVE_COOLING_OPTION_IDS,
  type CoolingSelection,
} from "@/domain/activeCooling";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

interface CoolingPreferencesModalProps {
  selection: CoolingSelection;
  onSave: (selectedOptionIds: readonly string[]) => boolean;
  onClose: () => void;
}

/** Mounted only while editing, so closing discards the unsaved draft. */
export function CoolingPreferencesModal({
  selection,
  onSave,
  onClose,
}: CoolingPreferencesModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const [draft, setDraft] = useState<string[]>(() =>
    selection.configured ? [...selection.selectedOptionIds] : [],
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const mobileModalOffset = `var(--mantine-spacing-${CONTENT_PADDING.base})`;

  const handleSave = () => {
    if (!onSave(draft)) {
      setSaveFailed(true);
      return;
    }
    onClose();
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={t("home.coolingPreferences.title")}
      closeButtonProps={{ "aria-label": t("home.coolingPreferences.close") }}
      centered={!isMobile}
      xOffset={isMobile ? mobileModalOffset : undefined}
      yOffset={isMobile ? mobileModalOffset : undefined}
    >
      <Stack gap={CONTENT_GAP}>
        <Checkbox.Group
          label={t("home.coolingPreferences.optionsLabel")}
          value={draft}
          onChange={(value) => {
            setDraft(value);
            setSaveFailed(false);
          }}
        >
          <Stack gap={CONTENT_GAP} mt={CONTENT_GAP}>
            {ACTIVE_COOLING_OPTION_IDS.map((id) => (
              <Checkbox
                key={id}
                value={id}
                label={t(`home.coolingPreferences.options.${id}`)}
              />
            ))}
          </Stack>
        </Checkbox.Group>
        <Text c="dimmed" size="sm">
          {t("home.coolingPreferences.emptyHint")}
        </Text>
        {saveFailed ? (
          <Alert color="red" role="alert">
            {t("home.coolingPreferences.saveError")}
          </Alert>
        ) : null}
        <Group justify="flex-end" gap={CONTENT_GAP}>
          <Button variant="default" onClick={onClose}>
            {t("home.coolingPreferences.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {t("home.coolingPreferences.save")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
