import { Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useHomeHeatRisk } from "@/hooks/useHomeHeatRisk";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import { MapSkeleton } from "@/components/home/HomeSectionSkeletons";
import { LocationMap } from "@/components/home/LocationMap";
import { SectionCard } from "@/components/ui/SectionCard";
import { useHomeStore } from "@/store/homeStore";

/**
 * Renders the Home page location map once a risk result is available.
 */
export function LocationMapSection() {
  const { t } = useTranslation();
  const selectedLocation = useHomeStore((state) => state.selectedLocation);
  const { meta, hasCalculatedRisk } = useHomeHeatRisk();

  if (!hasCalculatedRisk) {
    return (
      <SectionCard title={t("home.sections.map.title")}>
        <MapSkeleton />
      </SectionCard>
    );
  }

  const locationLabel =
    selectedLocation?.formattedLocation ??
    t("home.sections.map.locationFallback");
  const latitude = meta.latitude ?? selectedLocation?.latitude;
  const longitude = meta.longitude ?? selectedLocation?.longitude;
  const hasCoordinates =
    typeof latitude === "number" && typeof longitude === "number";

  if (!hasCoordinates) {
    return (
      <SectionCard title={t("home.sections.map.title")}>
        <Paper withBorder radius="md" p={CONTENT_PADDING} bg="gray.0">
          <Stack align="center" gap={CONTENT_GAP}>
            <Text fw={600}>
              {t("home.sections.map.missingCoordinatesTitle")}
            </Text>
            <Text c="dimmed" ta="center" maw={360}>
              {t("home.sections.map.missingCoordinatesBody", {
                location: locationLabel,
              })}
            </Text>
          </Stack>
        </Paper>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t("home.sections.map.title")}>
      <LocationMap
        latitude={latitude}
        longitude={longitude}
        label={locationLabel}
      />
    </SectionCard>
  );
}
