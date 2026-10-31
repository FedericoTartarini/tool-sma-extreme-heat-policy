import { rem } from "@mantine/core";

export const SECTION_STACK_GAP = "sm";

export const CONTENT_PADDING = {
  base: "sm",
  sm: "sm",
} as const;

export const CONTENT_GAP = CONTENT_PADDING.base;

/** Between closely related controls, such as a label and its control. */
export const COMPACT_GAP = "xs";

/**
 * Tighter than `CONTENT_GAP` on purpose: label/value rows and action icons on
 * dashboard cards, and the weekday chips, read as one group.
 */
export const DASHBOARD_TIGHT_GAP = 4;

/**
 * Shared by the dashboard card and its loading skeleton so the page does not
 * jump when card data arrives.
 */
export const DASHBOARD_CARD_MIN_HEIGHT = 168;

/**
 * Mirrors Mantine's `--button-height-xs` (1.875rem, scale-aware). Use it to
 * reserve space for a `size="xs"` Button that is conditionally rendered, so
 * the surrounding layout keeps its height when the button is absent.
 */
export const BUTTON_HEIGHT_XS = rem(30);

/**
 * Mirrors Mantine's `--ai-size-sm` (1.625rem, scale-aware), the size of a
 * `size="sm"` ActionIcon. Use it for placeholders that stand in for one.
 */
export const ACTION_ICON_SIZE_SM = rem(26);
