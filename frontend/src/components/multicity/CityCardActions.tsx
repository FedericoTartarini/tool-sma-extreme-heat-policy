import { ActionIcon, Group, Menu, Tooltip } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  UI_INLINE_ICON_SIZE,
  UI_INLINE_ICON_STROKE,
  MOBILE_CITY_CARD_ACTION_SIZE,
  CITY_CARD_CONTROL_LAYER_Z_INDEX,
} from "@/config/uiScale";

interface CityCardActionsProps {
  index: number;
  totalCount: number;
  isMobile: boolean;
  isVisible: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/**
 * Renders delete and reorder controls for a city card.
 */
export function CityCardActions({
  index,
  totalCount,
  isMobile,
  isVisible,
  onRemove,
  onMoveUp,
  onMoveDown,
}: CityCardActionsProps) {
  const { t } = useTranslation();
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  const stopPropagation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  const handleRemove = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onRemove();
  };

  const handleMoveUp = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onMoveUp();
  };

  const handleMoveDown = (event: { stopPropagation: () => void }) => {
    stopPropagation(event);
    onMoveDown();
  };

  if (isMobile) {
    return (
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            variant="light"
            color="gray"
            size={MOBILE_CITY_CARD_ACTION_SIZE}
            radius="xl"
            aria-label={t("multicity.cards.menuAriaLabel")}
            onClick={stopPropagation}
            style={{
              position: "relative",
              zIndex: CITY_CARD_CONTROL_LAYER_Z_INDEX,
            }}
          >
            <IconDots
              size={UI_INLINE_ICON_SIZE}
              stroke={UI_INLINE_ICON_STROKE}
            />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item disabled={!canMoveUp} onClick={handleMoveUp}>
            {t("multicity.cards.moveUp")}
          </Menu.Item>
          <Menu.Item disabled={!canMoveDown} onClick={handleMoveDown}>
            {t("multicity.cards.moveDown")}
          </Menu.Item>
          <Menu.Item color="red" onClick={handleRemove}>
            {t("multicity.cards.delete")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Group
      gap={4}
      wrap="nowrap"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: CITY_CARD_CONTROL_LAYER_Z_INDEX,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 150ms ease",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <Tooltip label={t("multicity.cards.moveLeft")}>
        <ActionIcon
          variant="light"
          color="gray"
          size="sm"
          aria-label={t("multicity.cards.moveLeft")}
          disabled={!canMoveUp}
          onClick={handleMoveUp}
        >
          <IconChevronLeft
            size={UI_INLINE_ICON_SIZE}
            stroke={UI_INLINE_ICON_STROKE}
          />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("multicity.cards.moveRight")}>
        <ActionIcon
          variant="light"
          color="gray"
          size="sm"
          aria-label={t("multicity.cards.moveRight")}
          disabled={!canMoveDown}
          onClick={handleMoveDown}
        >
          <IconChevronRight
            size={UI_INLINE_ICON_SIZE}
            stroke={UI_INLINE_ICON_STROKE}
          />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("multicity.cards.delete")}>
        <ActionIcon
          variant="light"
          color="red"
          size="sm"
          aria-label={t("multicity.cards.delete")}
          onClick={handleRemove}
        >
          <IconTrash
            size={UI_INLINE_ICON_SIZE}
            stroke={UI_INLINE_ICON_STROKE}
          />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
