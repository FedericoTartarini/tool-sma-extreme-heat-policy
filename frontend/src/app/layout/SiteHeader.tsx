import {
  Anchor,
  Box,
  Burger,
  Button,
  Container,
  Drawer,
  Group,
  Image,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { CONTENT_PADDING } from "@/config/uiLayout";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { toPublicAssetUrl } from "@/lib/publicAssetUrl";

function isRouteActive(currentPath: string, target: string): boolean {
  return target === "/" ? currentPath === "/" : currentPath.startsWith(target);
}

/**
 * Renders a three-slot header with stable title alignment across breakpoints.
 */
export function SiteHeader() {
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useIsMobileViewport();
  const location = useLocation();
  const { t } = useTranslation();
  const navItems = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.about"), to: "/about" },
  ];
  const mobileNavItems = [
    ...navItems,
    {
      label: t("nav.detailedRecommendations"),
      to: "/detailed-recommendations",
    },
  ];

  useEffect(() => {
    if (opened && !isMobile) {
      close();
    }
  }, [close, isMobile, opened]);

  const renderNavButton = (
    item: (typeof navItems)[number],
    options: {
      inactiveVariant: "subtle" | "light";
      size?: "xs" | "sm" | "md";
      justify?: "flex-start";
      onClick?: () => void;
    },
  ) => {
    const active = isRouteActive(location.pathname, item.to);

    return (
      <Button
        key={item.to}
        component={Link}
        to={item.to}
        onClick={options.onClick}
        justify={options.justify}
        variant={active ? "filled" : options.inactiveVariant}
        color={active ? "brand.6" : "gray"}
        size={options.size}
      >
        {item.label}
      </Button>
    );
  };

  return (
    <Box px={{ base: CONTENT_PADDING.base, sm: 0 }}>
      <Container
        component="header"
        size="sm"
        px={{ base: 0, sm: CONTENT_PADDING.sm }}
        bg="gray.1"
        mt={CONTENT_PADDING}
        mb={CONTENT_PADDING}
      >
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            alignItems: "center",
            columnGap: "12px",
          }}
        >
          <Anchor
            component={Link}
            to="/"
            onClick={close}
            style={{
              justifySelf: "start",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Image
              src={toPublicAssetUrl("branding/logo-usyd-black.png")}
              alt={t("nav.logoAlt")}
              height={35}
              width="auto"
              fit="contain"
            />
          </Anchor>

          <Text
            fw={700}
            fz={{ base: "md", sm: "lg" }}
            ta="center"
            lineClamp={1}
            style={{ justifySelf: "center" }}
          >
            {t("app.title")}
          </Text>

          <Box style={{ justifySelf: "end" }}>
            {!isMobile ? (
              <Group gap="xs" wrap="nowrap">
                {navItems.map((item) =>
                  renderNavButton(item, {
                    inactiveVariant: "subtle",
                    size: "sm",
                  }),
                )}
              </Group>
            ) : (
              <Burger
                opened={opened}
                onClick={opened ? close : open}
                aria-label={t("nav.toggleAriaLabel")}
              />
            )}
          </Box>
        </Box>
      </Container>

      <Drawer
        opened={opened}
        onClose={close}
        title={t("nav.drawerTitle")}
        padding="md"
        position="right"
        size="66.67vw"
      >
        <Stack gap="xs">
          {mobileNavItems.map((item) =>
            renderNavButton(item, {
              inactiveVariant: "light",
              size: "md",
              justify: "flex-start",
              onClick: close,
            }),
          )}
        </Stack>
      </Drawer>
    </Box>
  );
}
