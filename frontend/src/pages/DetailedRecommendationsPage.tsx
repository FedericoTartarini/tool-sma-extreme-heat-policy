import { Stack } from "@mantine/core";
import { AllRiskRecommendationsSection } from "@/components/home/recommendations/AllRiskRecommendationsSection";
import { SECTION_STACK_GAP } from "@/config/uiLayout";

/**
 * Renders a static documentation-style page for detailed recommendations.
 */
export function DetailedRecommendationsPage() {
  return (
    <Stack gap={SECTION_STACK_GAP}>
      <AllRiskRecommendationsSection />
    </Stack>
  );
}
