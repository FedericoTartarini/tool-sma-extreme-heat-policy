import { Box, Container, Stack } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { SiteFooter } from "@/app/layout/SiteFooter";
import { SiteHeader } from "@/app/layout/SiteHeader";
import { CONTENT_PADDING } from "@/config/uiLayout";

/**
 * Provides the shared page shell with header, content container, and footer.
 */
export function SiteShell() {
  return (
    <Stack gap={0} mih="100dvh" bg="gray.1">
      <SiteHeader />
      <Box component="main" flex={1}>
        <Container size="sm" pt={0} pb={CONTENT_PADDING} px={CONTENT_PADDING}>
          <Outlet />
        </Container>
      </Box>
      <SiteFooter />
    </Stack>
  );
}
