import { Box, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { CONTENT_GAP } from "@/config/uiLayout";
import { RECOMMENDATION_ACTION_IMAGE_CONFIG } from "@/config/responsiveImages";
import { COMPACT_RECOMMENDATION_LAYOUT_QUERY } from "@/config/uiScale";
import type { RecommendationDetailItem } from "@/lib/recommendationDetails";

interface RecommendationActionGridProps {
  items: RecommendationDetailItem[];
}

/**
 * Renders recommendation icons in a shared responsive grid.
 */
export function RecommendationActionGrid({
  items,
}: RecommendationActionGridProps) {
  const isCompactRecommendationLayout = useMediaQuery(
    COMPACT_RECOMMENDATION_LAYOUT_QUERY,
  );
  const recommendationColumnCount = Math.max(items.length, 1);
  const mobileRecommendationColumnCount = Math.min(
    recommendationColumnCount,
    2,
  );
  const shouldCenterLastRecommendation =
    isCompactRecommendationLayout &&
    mobileRecommendationColumnCount === 2 &&
    items.length > 1 &&
    items.length % 2 === 1;

  return (
    <SimpleGrid
      cols={{
        base: mobileRecommendationColumnCount,
        xs: recommendationColumnCount,
      }}
      spacing={CONTENT_GAP}
    >
      {items.map((item, index) => (
        <Box
          key={`${index}-${item.label}`}
          style={{
            ...(shouldCenterLastRecommendation && index === items.length - 1
              ? {
                  gridColumn: "1 / -1",
                  justifySelf: "center",
                  width: "100%",
                  minWidth: 0,
                }
              : {
                  width: "100%",
                  minWidth: 0,
                }),
          }}
        >
          <Stack align="center" gap={CONTENT_GAP}>
            {item.image !== null && (
              <Image
                src={item.image.src}
                srcSet={item.image.srcSet}
                sizes={item.image.sizes}
                loading="lazy"
                alt={item.label}
                w={RECOMMENDATION_ACTION_IMAGE_CONFIG.renderedSize}
                h={RECOMMENDATION_ACTION_IMAGE_CONFIG.renderedSize}
                fit="contain"
              />
            )}
            <Text
              fw={600}
              fz={{ base: "sm", sm: "md" }}
              lh={1}
              ta="center"
              title={item.label}
              w="100%"
              style={{
                minWidth: 0,
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </Text>
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  );
}
