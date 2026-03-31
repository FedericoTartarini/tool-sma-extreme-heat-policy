import { Accordion } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AboutSectionBlock } from "@/components/about/AboutSectionBlock";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AboutSection } from "@/domain/about";

/**
 * Renders the About page sections sourced from i18n content.
 */
export function AboutPage() {
  const { t } = useTranslation();
  const sections = t("about.sections", {
    returnObjects: true,
  }) as AboutSection[];
  const defaultSectionValue = sections[0]?.iconKey;

  return (
    <SectionCard>
      <Accordion
        chevronPosition="right"
        variant="separated"
        radius="md"
        defaultValue={defaultSectionValue}
      >
        {sections.map((section) => (
          <AboutSectionBlock key={section.iconKey} section={section} />
        ))}
      </Accordion>
    </SectionCard>
  );
}
