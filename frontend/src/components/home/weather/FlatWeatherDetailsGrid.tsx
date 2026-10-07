import {
  Box,
  Divider,
  Flex,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { WeatherDetailsCategorySection } from "@/components/home/weather/WeatherDetailsCategorySection";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import {
  WEATHER_DETAILS_GRID_SPACING,
  WEATHER_DETAILS_METRIC_LABEL,
  WEATHER_DETAILS_TITLE,
} from "@/config/weatherDetailsPresentation";
import {
  listAvailableWeatherGroups,
  type WeatherDetailsGroupDefinition,
} from "@/domain/weatherDetailsRegistry";
import {
  buildFlatWeatherDetailsDesktopLayout,
  buildFlatWeatherDetailsSections,
  type FlatWeatherDetailsSection,
} from "@/lib/weatherDetailsGridLayout";
import type { DayWeatherDetails } from "@/domain/weatherSummary";

interface FlatWeatherDetailsGridProps {
  details: DayWeatherDetails | null;
  isMobile: boolean;
}

/**
 * Single-panel weather details with category headings and dividers.
 */
export function FlatWeatherDetailsGrid({
  details,
  isMobile,
}: FlatWeatherDetailsGridProps) {
  const { t } = useTranslation();
  const groups = details ? listAvailableWeatherGroups(details) : [];

  return (
    <Stack gap={CONTENT_GAP}>
      <Text {...WEATHER_DETAILS_TITLE}>
        {t("home.sections.forecast.weatherDetails.title")}
      </Text>
      <Paper withBorder p={CONTENT_PADDING} bg="gray.0">
        {details && groups.length > 0 ? (
          isMobile ? (
            <MobileFlatWeatherDetailsLayout details={details} groups={groups} />
          ) : (
            <DesktopFlatWeatherDetailsLayout
              details={details}
              groups={groups}
            />
          )
        ) : (
          <Text {...WEATHER_DETAILS_METRIC_LABEL}>
            {t("home.sections.forecast.weatherDetails.unavailableForDay")}
          </Text>
        )}
      </Paper>
    </Stack>
  );
}

function PairedCategoryRow({
  groups,
  details,
}: {
  groups: readonly WeatherDetailsGroupDefinition[];
  details: DayWeatherDetails;
}) {
  return (
    <SimpleGrid cols={2} spacing={WEATHER_DETAILS_GRID_SPACING}>
      {groups.map((group) => (
        <Box key={group.id} miw={0}>
          <WeatherDetailsCategorySection
            group={group}
            details={details}
            metricColumns={1}
          />
        </Box>
      ))}
    </SimpleGrid>
  );
}

function DesktopHalvesRow({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  if (left && !right) {
    return <Box miw={0}>{left}</Box>;
  }

  if (!left && right) {
    return <Box miw={0}>{right}</Box>;
  }

  return (
    <Flex align="stretch" wrap="nowrap" gap={0}>
      <Box flex={1} miw={0}>
        {left}
      </Box>
      <Divider
        orientation="vertical"
        color="gray.3"
        mx={WEATHER_DETAILS_GRID_SPACING}
      />
      <Box flex={1} miw={0}>
        {right}
      </Box>
    </Flex>
  );
}

function DesktopGroupedCategories({
  groups,
  details,
  metricColumns = 1,
}: {
  groups: readonly WeatherDetailsGroupDefinition[];
  details: DayWeatherDetails;
  metricColumns?: number;
}) {
  if (groups.length === 0) {
    return null;
  }

  if (groups.length === 1) {
    return (
      <WeatherDetailsCategorySection
        group={groups[0]}
        details={details}
        metricColumns={metricColumns}
      />
    );
  }

  return (
    <Flex align="stretch" wrap="nowrap" gap={WEATHER_DETAILS_GRID_SPACING}>
      {groups.map((group) => (
        <Box key={group.id} flex={1} miw={0}>
          <WeatherDetailsCategorySection
            group={group}
            details={details}
            metricColumns={metricColumns}
          />
        </Box>
      ))}
    </Flex>
  );
}

function MobileFlatWeatherDetailsLayout({
  details,
  groups,
}: {
  details: DayWeatherDetails;
  groups: WeatherDetailsGroupDefinition[];
}) {
  const sections = buildFlatWeatherDetailsSections(groups);

  return (
    <Stack gap={WEATHER_DETAILS_GRID_SPACING}>
      {sections.map((section, index) => (
        <Fragment key={sectionKey(section)}>
          {index > 0 ? <Divider color="gray.3" /> : null}
          {section.kind === "pair" ? (
            <PairedCategoryRow groups={section.groups} details={details} />
          ) : (
            <WeatherDetailsCategorySection
              group={section.group}
              details={details}
              metricColumns={2}
            />
          )}
        </Fragment>
      ))}
    </Stack>
  );
}

function DesktopFlatWeatherDetailsLayout({
  details,
  groups,
}: {
  details: DayWeatherDetails;
  groups: WeatherDetailsGroupDefinition[];
}) {
  const { topRow, bottomRow } = buildFlatWeatherDetailsDesktopLayout(groups);

  return (
    <Stack gap={WEATHER_DETAILS_GRID_SPACING}>
      {topRow ? (
        <DesktopHalvesRow
          left={
            topRow.left ? (
              <WeatherDetailsCategorySection
                group={topRow.left}
                details={details}
                metricColumns={1}
              />
            ) : null
          }
          right={
            topRow.right.length > 0 ? (
              <DesktopGroupedCategories
                groups={topRow.right}
                details={details}
              />
            ) : null
          }
        />
      ) : null}

      {topRow && bottomRow ? <Divider color="gray.3" /> : null}

      {bottomRow ? (
        <DesktopHalvesRow
          left={
            bottomRow.left ? (
              <WeatherDetailsCategorySection
                group={bottomRow.left}
                details={details}
                metricColumns={2}
              />
            ) : null
          }
          right={
            bottomRow.right.length > 0 ? (
              <DesktopGroupedCategories
                groups={bottomRow.right}
                details={details}
                metricColumns={2}
              />
            ) : null
          }
        />
      ) : null}
    </Stack>
  );
}

function sectionKey(section: FlatWeatherDetailsSection): string {
  if (section.kind === "pair") {
    return section.groups.map((group) => group.id).join("-");
  }

  return section.group.id;
}
