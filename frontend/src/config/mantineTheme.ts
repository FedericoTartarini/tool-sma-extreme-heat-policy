import { createTheme, rem } from "@mantine/core";
import { SITE_MOBILE_BREAKPOINT } from "@/config/uiBreakpoints";
import { BRAND_COLOR_SCALE } from "@/config/uiColors";

export const appTheme = createTheme({
  primaryColor: "brand",
  primaryShade: 6,
  fontFamily: "Open Sans, Arial, sans-serif",
  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16),
    lg: rem(18),
    xl: rem(20),
  },
  headings: {
    fontFamily: "Open Sans, Arial, sans-serif",
    fontWeight: "700",
    sizes: {
      h2: {
        fontSize: rem(24),
        lineHeight: "1.3",
      },
      h3: {
        fontSize: rem(20),
        lineHeight: "1.35",
      },
    },
  },
  defaultRadius: "md",
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },
  breakpoints: {
    xs: "36em",
    sm: SITE_MOBILE_BREAKPOINT,
    md: "62em",
    lg: "75em",
    xl: "88em",
  },
  colors: {
    brand: [...BRAND_COLOR_SCALE],
  },
  components: {
    Stack: {
      defaultProps: {
        gap: "sm",
      },
    },
  },
});
