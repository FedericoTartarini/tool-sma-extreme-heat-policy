import {
  IconAlertTriangle,
  IconBan,
  IconFileAlert,
  IconHeartRateMonitor,
  IconInfoCircle,
  IconLayoutGrid,
  IconScale,
  IconShieldLock,
  IconSunHigh,
  IconWorldWww,
} from "@tabler/icons-react";
import {
  Accordion,
  Anchor,
  Group,
  List,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { Fragment, type ReactNode } from "react";
import type {
  AboutParagraph,
  AboutSection,
  AboutSectionIconKey,
} from "@/domain/about";
import { CONTENT_GAP } from "@/config/uiLayout";
import {
  PARAGRAPH_GAP,
  RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT,
  STANDARD_TEXT_LINE_HEIGHT,
} from "@/config/uiTypography";
import {
  UI_TITLE_ICON_SIZE,
  UI_TITLE_ICON_STROKE,
  UI_TITLE_THEME_ICON_SIZE,
} from "@/config/uiScale";
import { buildAboutContentBlocks } from "@/lib/aboutLayout";

interface AboutSectionBlockProps {
  section: AboutSection;
}

interface AboutTitleIconConfig {
  color: string;
  icon: ReactNode;
}

const ABOUT_DEFAULT_TITLE_ICON_CONFIG: AboutTitleIconConfig = {
  color: "teal",
  icon: (
    <IconInfoCircle size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />
  ),
};

const ABOUT_TITLE_ICON_CONFIG_BY_KEY: Record<
  AboutSectionIconKey,
  AboutTitleIconConfig
> = {
  overview: {
    color: "teal",
    icon: (
      <IconWorldWww size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />
    ),
  },
  functionalities: {
    color: "blue",
    icon: (
      <IconLayoutGrid size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />
    ),
  },
  "heat-risk": {
    color: "orange",
    icon: (
      <IconHeartRateMonitor
        size={UI_TITLE_ICON_SIZE}
        stroke={UI_TITLE_ICON_STROKE}
      />
    ),
  },
  "uv-guide": {
    color: "yellow",
    icon: (
      <IconSunHigh size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />
    ),
  },
  terms: {
    color: "gray",
    icon: <IconScale size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />,
  },
  "medical-disclaimer": {
    color: "orange",
    icon: (
      <IconAlertTriangle
        size={UI_TITLE_ICON_SIZE}
        stroke={UI_TITLE_ICON_STROKE}
      />
    ),
  },
  warranty: {
    color: "gray",
    icon: (
      <IconFileAlert size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />
    ),
  },
  privacy: {
    color: "indigo",
    icon: (
      <IconShieldLock size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />
    ),
  },
  "unacceptable-activity": {
    color: "red",
    icon: <IconBan size={UI_TITLE_ICON_SIZE} stroke={UI_TITLE_ICON_STROKE} />,
  },
};

function getAboutTitleIconConfig(
  iconKey: AboutSectionIconKey,
): AboutTitleIconConfig {
  return (
    ABOUT_TITLE_ICON_CONFIG_BY_KEY[iconKey] ?? ABOUT_DEFAULT_TITLE_ICON_CONFIG
  );
}

function renderParagraphRuns(
  sectionTitle: string,
  blockKey: string,
  paragraph: AboutParagraph,
) {
  return paragraph.runs.map((run, runIndex) =>
    "href" in run ? (
      <Anchor key={`${sectionTitle}-${blockKey}-${runIndex}`} href={run.href}>
        {run.text}
      </Anchor>
    ) : (
      <Fragment key={`${sectionTitle}-${blockKey}-${runIndex}`}>
        {run.text}
      </Fragment>
    ),
  );
}

/**
 * Renders one About accordion item from i18n-provided rich paragraph data.
 */
export function AboutSectionBlock({ section }: AboutSectionBlockProps) {
  const titleIconConfig = getAboutTitleIconConfig(section.iconKey);
  const contentBlocks = buildAboutContentBlocks(section);

  return (
    <Accordion.Item value={section.iconKey}>
      <Accordion.Control>
        <Group gap={CONTENT_GAP} wrap="nowrap">
          <ThemeIcon
            color={titleIconConfig.color}
            variant="light"
            size={UI_TITLE_THEME_ICON_SIZE}
            radius="xl"
          >
            {titleIconConfig.icon}
          </ThemeIcon>
          <Text
            fw={700}
            fz={{ base: "md", sm: "lg" }}
            lh={RESPONSIVE_STANDARD_TEXT_LINE_HEIGHT}
          >
            {section.title}
          </Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap={PARAGRAPH_GAP}>
          {contentBlocks.map((block, blockIndex) =>
            block.type === "paragraph" ? (
              <Text
                key={`${section.title}-paragraph-${blockIndex}`}
                c="dark.7"
                fz="md"
                lh={STANDARD_TEXT_LINE_HEIGHT}
                fs={block.paragraph.italic ? "italic" : undefined}
              >
                {renderParagraphRuns(
                  section.title,
                  `paragraph-${blockIndex}`,
                  block.paragraph,
                )}
              </Text>
            ) : (
              <List
                key={`${section.title}-list-${blockIndex}`}
                spacing={PARAGRAPH_GAP}
                size="md"
                withPadding
              >
                {block.items.map((item, itemIndex) => (
                  <List.Item
                    key={`${section.title}-list-item-${blockIndex}-${itemIndex}`}
                  >
                    <Text
                      component="span"
                      c="dark.7"
                      fz="md"
                      lh={STANDARD_TEXT_LINE_HEIGHT}
                      fs={item.italic ? "italic" : undefined}
                    >
                      {renderParagraphRuns(
                        section.title,
                        `list-${blockIndex}-${itemIndex}`,
                        item,
                      )}
                    </Text>
                  </List.Item>
                ))}
              </List>
            ),
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
