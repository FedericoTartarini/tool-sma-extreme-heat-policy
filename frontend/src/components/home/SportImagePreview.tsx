import { Box, Image, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP } from "@/config/uiLayout";
import { getImageLoadFailureUrl } from "@/lib/imageElement";
import type { ResponsiveImageAsset } from "@/lib/responsiveImage";

const SPORT_IMAGE_HEIGHT = 104;

interface SportImagePreviewProps {
  image: ResponsiveImageAsset | null;
  sportLabel: string;
  failedImageUrl: string | null;
  onImageLoadFailure: (url: string) => void;
}

export function SportImagePreview({
  image,
  sportLabel,
  failedImageUrl,
  onImageLoadFailure,
}: SportImagePreviewProps) {
  const { t } = useTranslation();

  return (
    <Box h={SPORT_IMAGE_HEIGHT}>
      {image !== null && failedImageUrl === null ? (
        <Image
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt={t("home.sections.filters.sportImageAlt", { sportLabel })}
          w="100%"
          h={SPORT_IMAGE_HEIGHT}
          radius="sm"
          onError={(event) => {
            onImageLoadFailure(getImageLoadFailureUrl(event.currentTarget));
          }}
        />
      ) : (
        <Stack
          align="center"
          justify="center"
          gap={CONTENT_GAP}
          h="100%"
          px={CONTENT_GAP}
        >
          <Text fw={500} fz="sm">
            {t("home.sections.filters.sportImageUnavailable")}
          </Text>
          <Text c="dimmed" fz="xs" ta="center">
            {failedImageUrl !== null
              ? t("home.sections.filters.sportImageHelp", {
                  sportLabel,
                  path: failedImageUrl,
                })
              : t("home.sections.filters.sportImageNotConfigured", {
                  sportLabel,
                })}
          </Text>
        </Stack>
      )}
    </Box>
  );
}
