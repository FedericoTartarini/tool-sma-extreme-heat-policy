import {
  WEATHER_DETAILS_DESKTOP_ROWS,
  WEATHER_DETAILS_MOBILE_PAIRS,
  type WeatherDetailsDesktopRowLayout,
} from "@/config/weatherDetailsGridConfig";
import type {
  WeatherDetailsGroupDefinition,
  WeatherDetailsGroupId,
} from "@/domain/weatherDetailsRegistry";

export type FlatWeatherDetailsSection =
  | { kind: "single"; group: WeatherDetailsGroupDefinition }
  | { kind: "pair"; groups: WeatherDetailsGroupDefinition[] };

export interface FlatWeatherDetailsDesktopHalves {
  left: WeatherDetailsGroupDefinition | null;
  right: WeatherDetailsGroupDefinition[];
  metricColumns: 1 | 2;
}

export interface FlatWeatherDetailsDesktopLayout {
  rows: FlatWeatherDetailsDesktopHalves[];
}

function isConfiguredMobilePair(
  first: WeatherDetailsGroupId,
  second: WeatherDetailsGroupId | undefined,
): boolean {
  if (!second) {
    return false;
  }

  return WEATHER_DETAILS_MOBILE_PAIRS.some(
    ([left, right]) => left === first && right === second,
  );
}

function buildDesktopRow(
  row: WeatherDetailsDesktopRowLayout,
  groupsById: Map<WeatherDetailsGroupId, WeatherDetailsGroupDefinition>,
): FlatWeatherDetailsDesktopHalves | null {
  const left = row.left ? (groupsById.get(row.left) ?? null) : null;
  const right = row.right
    .map((groupId) => groupsById.get(groupId))
    .filter(
      (group): group is WeatherDetailsGroupDefinition => group !== undefined,
    );

  if (!left && right.length === 0) {
    return null;
  }

  return { left, right, metricColumns: row.metricColumns };
}

/**
 * Groups configured mobile pairs into one flat-panel row when adjacent.
 */
export function buildFlatWeatherDetailsSections(
  groups: readonly WeatherDetailsGroupDefinition[],
): FlatWeatherDetailsSection[] {
  const sections: FlatWeatherDetailsSection[] = [];
  let index = 0;

  while (index < groups.length) {
    const group = groups[index];
    const nextGroup = groups[index + 1];

    if (isConfiguredMobilePair(group.id, nextGroup?.id)) {
      sections.push({ kind: "pair", groups: [group, nextGroup] });
      index += 2;
      continue;
    }

    sections.push({ kind: "single", group });
    index += 1;
  }

  return sections;
}

/**
 * Builds desktop halves from the configured row placements.
 */
export function buildFlatWeatherDetailsDesktopLayout(
  groups: readonly WeatherDetailsGroupDefinition[],
  desktopRows: readonly WeatherDetailsDesktopRowLayout[] = WEATHER_DETAILS_DESKTOP_ROWS,
): FlatWeatherDetailsDesktopLayout {
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  return {
    rows: desktopRows.flatMap((row) => {
      const desktopRow = buildDesktopRow(row, groupsById);
      return desktopRow ? [desktopRow] : [];
    }),
  };
}
