import { CONTENT_GAP } from "@/config/uiLayout";

export const STANDARD_TEXT_LINE_HEIGHT = "md";

export const RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT = {
  base: "md",
  sm: "lg",
} as const;

export const PARAGRAPH_GAP = CONTENT_GAP;

export const COMPACT_LABEL_TEXT_PROPS = {
  fw: 600,
  fz: { base: "sm", sm: "md" } as const,
  lh: 1,
};
