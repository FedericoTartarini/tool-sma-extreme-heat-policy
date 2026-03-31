import { Stack } from "@mantine/core";
import { DetailedRecommendationsSection } from "@/components/home/DetailedRecommendationsSection";
import { SECTION_STACK_GAP } from "@/config/uiLayout";

/**
 * Renders a static documentation-style page for detailed recommendations.
 */
export function DetailedRecommendationsPage() {
  return (
    <Stack gap={SECTION_STACK_GAP}>
      <DetailedRecommendationsSection />
    </Stack>
  );
}
