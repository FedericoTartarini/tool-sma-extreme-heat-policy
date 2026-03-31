import { useMediaQuery } from "@mantine/hooks";
import { SITE_MOBILE_QUERY } from "@/config/uiBreakpoints";

/**
 * Returns whether the current viewport is within the shared site mobile range.
 */
export function useIsMobileViewport(): boolean {
  return useMediaQuery(SITE_MOBILE_QUERY);
}
