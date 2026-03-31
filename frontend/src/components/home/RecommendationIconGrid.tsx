import { Image, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  ACTION_IMAGE_ICON_SIZE,
  COMPACT_RECOMMENDATION_LAYOUT_QUERY,
} from "@/config/uiScale";

export interface RecommendationIconItem {
  src: string;
  label: string;
}

interface RecommendationIconGridProps {
  items: RecommendationIconItem[];
}

/**
 * Renders recommendation icons in a shared responsive grid.
 */
export function RecommendationIconGrid({ items }: RecommendationIconGridProps) {
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
        <Stack
          key={`${item.src}-${item.label}`}
          align="center"
          gap={CONTENT_GAP}
          style={
            shouldCenterLastRecommendation && index === items.length - 1
              ? {
                  gridColumn: "1 / -1",
                  justifySelf: "center",
                  width: "100%",
                  minWidth: 0,
                }
              : {
                  width: "100%",
                  minWidth: 0,
                }
          }
        >
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
            ta="center"
            title={item.label}
            w="100%"
            style={{
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.label}
          </Text>
        </Stack>
      ))}
    </SimpleGrid>
  );
}
