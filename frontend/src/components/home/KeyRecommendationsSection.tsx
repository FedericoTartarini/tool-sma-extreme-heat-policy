import { useTranslation } from "react-i18next";
import { RISK_REGISTRY } from "@/domain/riskRegistry";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { KeyRecommendationsSkeleton } from "@/components/home/HomeSectionSkeletons";
import { RecommendationIconGrid } from "@/components/home/RecommendationIconGrid";
import { SectionCard } from "@/components/ui/SectionCard";

/**
 * Renders compact recommendation cards for the current risk level.
 */
export function KeyRecommendationsSection() {
  const { t } = useTranslation();
  const heatRisk = useHomeHeatRisk();

  if (!heatRisk.hasCalculatedRisk) {
    return (
      <SectionCard title={t("home.sections.keyRecommendations.title")}>
        <KeyRecommendationsSkeleton />
      </SectionCard>
    );
  }

  const labels = t(RISK_REGISTRY[heatRisk.riskLevel].keyRecommendationsKey, {
    returnObjects: true,
  }) as string[];
  const icons = RISK_REGISTRY[heatRisk.riskLevel].keyIconPaths;

  const recommendations = icons
    .map((icon, index) => ({ src: icon, label: labels[index] ?? "" }))
    .filter((item) => item.label);

  return (
    <SectionCard title={t("home.sections.keyRecommendations.title")}>
      <RecommendationIconGrid items={recommendations} />
    </SectionCard>
  );
}
