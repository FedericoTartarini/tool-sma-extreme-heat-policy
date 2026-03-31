import { SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { CONTENT_GAP } from "@/config/uiLayout";
import { ACTION_IMAGE_ICON_SIZE } from "@/config/uiScale";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { getRiskGaugeGeometry, RISK_GAUGE_MAX_WIDTH } from "@/lib/riskGauge";

const CURRENT_RISK_GAUGE_WIDTH = RISK_GAUGE_MAX_WIDTH;
const CURRENT_RISK_GAUGE_HEIGHT = getRiskGaugeGeometry(
  false,
  CURRENT_RISK_GAUGE_WIDTH,
).height;
const FORECAST_CHART_HEIGHT = 340;
const MOBILE_FORECAST_CHART_HEIGHT = 280;
const MAP_HEIGHT = 160;
const SKELETON_RECOMMENDATION_COUNT = 4;
const SKELETON_FORECAST_ROW_COUNT = 3;

/**
 * Renders a chart-shaped skeleton placeholder for current risk loading states.
 */
export function CurrentRiskSkeleton() {
  return (
    <Stack gap={CONTENT_GAP}>
      <Skeleton
        h={CURRENT_RISK_GAUGE_HEIGHT}
        w="100%"
        maw={CURRENT_RISK_GAUGE_WIDTH}
        mx="auto"
        radius="xl"
      />
      <Skeleton h={30} w={128} mx="auto" radius="xl" />
    </Stack>
  );
}

/**
 * Renders recommendation-card skeleton tiles while recommendations reload.
 */
export function KeyRecommendationsSkeleton() {
  return (
    <SimpleGrid
      cols={{ base: 2, xs: SKELETON_RECOMMENDATION_COUNT }}
      spacing={CONTENT_GAP}
    >
      {Array.from({ length: SKELETON_RECOMMENDATION_COUNT }, (_, index) => (
        <Stack
          key={`recommendation-skeleton-${index}`}
          align="center"
          gap={CONTENT_GAP}
        >
          <Skeleton
            h={ACTION_IMAGE_ICON_SIZE}
            w={ACTION_IMAGE_ICON_SIZE}
            circle
          />
          <Skeleton h={14} w="70%" maw={120} />
        </Stack>
      ))}
    </SimpleGrid>
  );
}

/**
 * Renders chart and accordion-row skeletons for forecast loading states.
 */
export function ForecastSkeleton() {
  const isMobile = useIsMobileViewport();
  const chartHeight = isMobile
    ? MOBILE_FORECAST_CHART_HEIGHT
    : FORECAST_CHART_HEIGHT;

  return (
    <Stack gap={CONTENT_GAP}>
      <Skeleton h={chartHeight} radius="md" />
      {Array.from({ length: SKELETON_FORECAST_ROW_COUNT }, (_, index) => (
        <Skeleton key={`forecast-row-skeleton-${index}`} h={56} radius="md" />
      ))}
    </Stack>
  );
}

/**
 * Renders a map-card skeleton placeholder while location map data reloads.
 */
export function MapSkeleton() {
  return <Skeleton h={MAP_HEIGHT} radius="md" />;
}
