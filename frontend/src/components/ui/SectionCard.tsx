import { Box, Flex, Paper, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import { RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT } from "@/config/uiTypography";

interface SectionCardProps {
  title?: string;
  titleIcon?: ReactNode;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Wraps page sections in a consistent card container and heading block.
 */
export function SectionCard({
  title,
  titleIcon,
  subtitle,
  children,
}: SectionCardProps) {
  const hasTitle = Boolean(title?.trim());
  const hasHeading = hasTitle || Boolean(subtitle);

  return (
    <Paper radius="md" p={CONTENT_PADDING}>
      {hasHeading ? (
        <Stack gap={CONTENT_GAP} mb={CONTENT_PADDING}>
          {hasTitle ? (
            <Title order={2} fz={{ base: "h3", sm: "h2" }}>
              <Flex
                component="span"
                align="center"
                gap={CONTENT_GAP}
                wrap="nowrap"
                style={{
                  display: "inline-flex",
                }}
              >
                {titleIcon ? (
                  <Box
                    component="span"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {titleIcon}
                  </Box>
                ) : null}
                <span>{title}</span>
              </Flex>
            </Title>
          ) : null}
          {subtitle ? (
            <Text
              c="dimmed"
              fz={{ base: "md", sm: "lg" }}
              lh={RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT}
            >
              {subtitle}
            </Text>
          ) : null}
        </Stack>
      ) : null}
      {children}
    </Paper>
  );
}
