import {
  Anchor,
  Box,
  Container,
  Grid,
  Image,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import {
  PARAGRAPH_GAP,
  STANDARD_TEXT_LINE_HEIGHT,
} from "@/config/uiTypography";
import { toPublicAssetUrl } from "@/lib/publicAssetUrl";

const APP_VERSION = "1.2.2";
const COPYRIGHT_YEAR = 2025;
const REVIEW_YEAR = 2025;
const FOOTER_LOGO_SLOT_HEIGHT = 50;
const FOOTER_TEXT_PROPS = {
  inherit: true,
  lh: STANDARD_TEXT_LINE_HEIGHT,
} as const;

const footerLinkStyles = {
  root: {
    color: "inherit",
    textDecoration: "underline",
    textUnderlineOffset: "0.14em",
    transition: "opacity 150ms ease",
    "&:hover": {
      opacity: 0.72,
    },
  },
};

/**
 * Renders the site footer with credits, citation, and contact links.
 */
export function SiteFooter() {
  const { t } = useTranslation();
  const logoBlocks = [
    {
      key: "usyd",
      label: t("footer.developedBy"),
      src: toPublicAssetUrl("branding/logo-usyd-black.png"),
      alt: t("footer.usydLogoAlt"),
      height: 50,
    },
    {
      key: "sma",
      label: t("footer.endorsedBy"),
      src: toPublicAssetUrl("branding/sma-black.png"),
      alt: t("footer.smaLogoAlt"),
      height: 50,
    },
  ] as const;

  const renderLogoBlock = (logo: (typeof logoBlocks)[number]) => (
    <Stack key={logo.key} gap={CONTENT_GAP} align="flex-start">
      <Text {...FOOTER_TEXT_PROPS}>{logo.label}</Text>
      <Box
        h={FOOTER_LOGO_SLOT_HEIGHT}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <Image
          src={logo.src}
          alt={logo.alt}
          w="auto"
          h={logo.height}
          fit="contain"
        />
      </Box>
    </Stack>
  );

  return (
    <Box
      component="footer"
      bg="brand.6"
      c="dark.9"
      py={CONTENT_PADDING}
      px={{ base: CONTENT_PADDING.base, sm: 0 }}
    >
      <Container size="sm" px={{ base: 0, sm: CONTENT_PADDING.sm }}>
        <Grid gutter={CONTENT_GAP} align="start">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <SimpleGrid
              cols={{ base: 2, sm: 1 }}
              spacing={CONTENT_GAP}
              verticalSpacing={CONTENT_GAP}
            >
              {logoBlocks.map(renderLogoBlock)}
            </SimpleGrid>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 8 }}>
            <Stack gap={PARAGRAPH_GAP}>
              <Anchor
                lh={STANDARD_TEXT_LINE_HEIGHT}
                styles={footerLinkStyles}
                href="https://sydney.au1.qualtrics.com/jfe/form/SV_3jAqlzAnAoAOU8S"
                target="_blank"
                rel="noreferrer"
              >
                {t("footer.feedbackLink")}
              </Anchor>
              <Text {...FOOTER_TEXT_PROPS}>{t("footer.citePrompt")}</Text>
              <Anchor
                lh={STANDARD_TEXT_LINE_HEIGHT}
                styles={footerLinkStyles}
                href="https://doi.org/10.1016/j.jsams.2025.03.006"
                target="_blank"
                rel="noreferrer"
              >
                {t("footer.paperTitle")}
              </Anchor>
              <Text {...FOOTER_TEXT_PROPS}>{t("footer.authors")}</Text>
              <Text {...FOOTER_TEXT_PROPS} fs="italic">
                {t("footer.journal")}
              </Text>
              <Text {...FOOTER_TEXT_PROPS}>
                {t("footer.copyright", { year: COPYRIGHT_YEAR })}
              </Text>
              <Text {...FOOTER_TEXT_PROPS}>
                {t("footer.reviewedBy", { year: REVIEW_YEAR })}
              </Text>
              <Text {...FOOTER_TEXT_PROPS}>
                {t("footer.version", { version: APP_VERSION })}
              </Text>
              <Anchor
                lh={STANDARD_TEXT_LINE_HEIGHT}
                styles={footerLinkStyles}
                href="mailto:federico.tartarini@sydney.edu.au"
              >
                {t("footer.contactUs")}
              </Anchor>
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}
