import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useState } from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconDotsVertical,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
  UI_INLINE_ICON_SIZE,
  UI_INLINE_ICON_STROKE,
  UI_TITLE_ICON_SIZE,
} from "@/config/uiScale";
import { RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

interface DashboardCardActionsProps {
  index: number;
  totalCount: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/**
 * Renders delete and reorder controls for a dashboard card.
 */
export function DashboardCardActions({
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
}: DashboardCardActionsProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;
  const controlLayerStyle = {
    flexShrink: 0,
    zIndex: DASHBOARD_CARD_CONTROL_LAYER_Z_INDEX,
  };

  const stopPropagation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const openDeleteConfirm = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
  };

  const confirmRemove = () => {
    onRemove();
  };

  const deleteConfirmModal = (
    <Modal
      opened={isDeleteConfirmOpen}
      onClose={closeDeleteConfirm}
      title={t("dashboard.cards.deleteConfirm.title")}
      centered
      size="lg"
      onClick={stopPropagation}
    >
      <Stack gap={CONTENT_GAP}>
        <Text c="dimmed" fz="sm" lh={RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT}>
          {t("dashboard.cards.deleteConfirm.message")}
        </Text>
        <Group wrap="nowrap" align="center" gap={CONTENT_GAP}>
          <Button
            variant="default"
            size="md"
            flex={1}
            onClick={closeDeleteConfirm}
          >
            {t("dashboard.cards.deleteConfirm.cancel")}
          </Button>
          <Button size="md" flex={1} onClick={confirmRemove}>
            {t("dashboard.cards.deleteConfirm.confirm")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  const handleMoveUp = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onMoveUp();
  };

  const handleMoveDown = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onMoveDown();
  };

  if (isMobile) {
    const moreActionsLabel = t("dashboard.cards.moreActions");

    return (
      <>
        <Box pos="relative" style={controlLayerStyle} onClick={stopPropagation}>
          <Menu position="bottom-end" width={180} withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label={moreActionsLabel}
              >
                <IconDotsVertical
                  size={UI_TITLE_ICON_SIZE}
                  aria-hidden="true"
                />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={
                  <IconChevronUp
                    size={UI_INLINE_ICON_SIZE}
                    aria-hidden="true"
                  />
                }
                disabled={!canMoveUp}
                onClick={handleMoveUp}
              >
                {t("dashboard.cards.moveUp")}
              </Menu.Item>
              <Menu.Item
                leftSection={
                  <IconChevronDown
                    size={UI_INLINE_ICON_SIZE}
                    aria-hidden="true"
                  />
                }
                disabled={!canMoveDown}
                onClick={handleMoveDown}
              >
                {t("dashboard.cards.moveDown")}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={
                  <IconTrash size={UI_INLINE_ICON_SIZE} aria-hidden="true" />
                }
                color="red"
                onClick={openDeleteConfirm}
              >
                {t("dashboard.cards.delete")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
        {deleteConfirmModal}
      </>
    );
  }

  return (
    <>
      <Group gap={4} wrap="nowrap" style={controlLayerStyle}>
        <Tooltip label={t("dashboard.cards.moveLeft")}>
          <ActionIcon
            variant="light"
            color="gray"
            size="sm"
            aria-label={t("dashboard.cards.moveLeft")}
            disabled={!canMoveUp}
            onClick={handleMoveUp}
          >
            <IconChevronLeft
              size={UI_INLINE_ICON_SIZE}
              stroke={UI_INLINE_ICON_STROKE}
            />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("dashboard.cards.moveRight")}>
          <ActionIcon
            variant="light"
            color="gray"
            size="sm"
            aria-label={t("dashboard.cards.moveRight")}
            disabled={!canMoveDown}
            onClick={handleMoveDown}
          >
            <IconChevronRight
              size={UI_INLINE_ICON_SIZE}
              stroke={UI_INLINE_ICON_STROKE}
            />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("dashboard.cards.delete")}>
          <ActionIcon
            variant="light"
            color="red"
            size="sm"
            aria-label={t("dashboard.cards.delete")}
            onClick={openDeleteConfirm}
          >
            <IconTrash
              size={UI_INLINE_ICON_SIZE}
              stroke={UI_INLINE_ICON_STROKE}
            />
          </ActionIcon>
        </Tooltip>
      </Group>
      {deleteConfirmModal}
    </>
  );
}
