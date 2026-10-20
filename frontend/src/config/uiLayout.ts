import { rem } from "@mantine/core";

export const SECTION_STACK_GAP = "sm";

export const CONTENT_PADDING = {
  base: "sm",
  sm: "sm",
} as const;

export const CONTENT_GAP = CONTENT_PADDING.base;

/**
 * Mirrors Mantine's `--button-height-xs` (1.875rem, scale-aware). Use it to
 * reserve space for a `size="xs"` Button that is conditionally rendered, so
 * the surrounding layout keeps its height when the button is absent.
 */
export const BUTTON_HEIGHT_XS = rem(30);
