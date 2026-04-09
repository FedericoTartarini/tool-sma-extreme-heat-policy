import { Box, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  ACTION_IMAGE_ICON_SIZE,
  COMPACT_RECOMMENDATION_LAYOUT_QUERY,
} from "@/config/uiScale";
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
          key={`${item.src}-${item.label}`}
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
            <Image
              src={item.src}
              alt={item.label}
              w={ACTION_IMAGE_ICON_SIZE}
              h={ACTION_IMAGE_ICON_SIZE}
              fit="contain"
            />
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
                textOverflow: "ellipsis",
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
