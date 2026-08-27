import { Avatar, Badge, Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CityCardActions } from "@/components/multicity/CityCardActions";
import { CityCardSkeleton } from "@/components/multicity/MultiCitySkeletons";
import {
  buildMulticityHomePath,
  formatSavedLocationSubtitle,
  toSavedLocationAvatarLabel,
  type SavedLocation,
} from "@/domain/multicity";
import {
  toMulticityBatchErrorI18nKey,
  toMulticityCardErrorI18nKey,
  type MulticityCityCardState,
} from "@/domain/multicityBatch";
import type { SportType } from "@/domain/sport";
import { createRiskLevelLabels } from "@/domain/riskLabels";
import type { RiskLevel } from "@/domain/risk";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
  getRiskLevelI18nKeys,
} from "@/domain/riskRegistry";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { CONTENT_GAP, CONTENT_PADDING } from "@/config/uiLayout";
import {
  CITY_CARD_CONTROL_LAYER_Z_INDEX,
  CITY_CARD_HIT_LAYER_Z_INDEX,
} from "@/config/uiScale";

const RISK_BADGE_SHADOW = "0 10px 24px rgba(15, 23, 42, 0.08)";

interface CityCardProps {
  location: SavedLocation;
  cardState: MulticityCityCardState;
  sport: SportType;
  index: number;
  totalCount: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function CityCardRiskBadge({
  riskLevel,
  size = "lg",
}: {
  riskLevel: RiskLevel;
  size?: "md" | "lg" | "xl";
}) {
  const { t } = useTranslation();
  const longRiskLabels = createRiskLevelLabels((key) => t(key), "long");

  return (
    <Badge
      color={getRiskColor(riskLevel)}
      size={size}
      radius="xl"
      styles={{
        root: {
          color: getRiskBadgeForegroundColor(riskLevel),
          boxShadow: RISK_BADGE_SHADOW,
          flexShrink: 0,
        },
        label: {
          fontWeight: 700,
          letterSpacing: "0.06em",
        },
      }}
    >
      {longRiskLabels[riskLevel].toUpperCase()}
    </Badge>
  );
}

function CityCardStatusContent({
  cardState,
  isMobile,
}: {
  cardState: MulticityCityCardState;
  isMobile: boolean;
}) {
  const { t } = useTranslation();

  if (cardState.status === "ok") {
    if (isMobile) {
      return (
        <>
          <CityCardRiskBadge riskLevel={cardState.currentRiskLevel} size="lg" />
          <Text c="dimmed" fz="sm">
            {t("home.sections.forecast.maxRiskLabel")}{" "}
            <Text
              component="span"
              fw={600}
              c={getRiskColor(cardState.todayMaxRiskLevel)}
            >
              {t(
                getRiskLevelI18nKeys(cardState.todayMaxRiskLevel).levelKey,
              ).toUpperCase()}
            </Text>
          </Text>
        </>
      );
    }

    return (
      <>
        <CityCardRiskBadge riskLevel={cardState.currentRiskLevel} />
        <Text c="dimmed" fz="sm">
          {t("home.sections.forecast.maxRiskLabel")}{" "}
          <Text
            component="span"
            fw={600}
            c={getRiskColor(cardState.todayMaxRiskLevel)}
          >
            {t(
              getRiskLevelI18nKeys(cardState.todayMaxRiskLevel).levelKey,
            ).toUpperCase()}
          </Text>
        </Text>
      </>
    );
  }

  return (
    <Text c="dimmed" fz="sm">
      {cardState.status === "batch_error"
        ? t(toMulticityBatchErrorI18nKey(cardState.reason))
        : cardState.status === "location_error"
          ? t(toMulticityCardErrorI18nKey(cardState.errorCode))
          : t("multicity.cardErrors.missingResult")}
    </Text>
  );
}

function CityCardTitleLink({
  homePath,
  name,
  ariaLabel,
  lineClamp,
}: {
  homePath: string;
  name: string;
  ariaLabel: string;
  lineClamp: number;
}) {
  return (
    <Text
      component={Link}
      to={homePath}
      fw={700}
      lineClamp={lineClamp}
      aria-label={ariaLabel}
      c="inherit"
      pos="relative"
      style={{
        textDecoration: "none",
        zIndex: CITY_CARD_CONTROL_LAYER_Z_INDEX,
      }}
    >
      {name}
    </Text>
  );
}

function CityCardHomeOverlay({ homePath }: { homePath: string }) {
  return (
    <Link
      to={homePath}
      tabIndex={-1}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: CITY_CARD_HIT_LAYER_Z_INDEX,
      }}
    />
  );
}

/**
 * Renders a saved city card with current risk and today's max from batch data.
 */
export function CityCard({
  location,
  cardState,
  sport,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
}: CityCardProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobileViewport();
  const [isHovered, setIsHovered] = useState(false);
  const locationSubtitle = formatSavedLocationSubtitle(location);
  const shouldShowLocationSubtitle =
    locationSubtitle.length > 0 && locationSubtitle !== location.name;
  const homePath = buildMulticityHomePath(sport, location.displayLabel);
  const openHomeAriaLabel = t("multicity.cards.openHomeAriaLabel", {
    city: location.displayLabel,
  });

  if (cardState.status === "loading") {
    return <CityCardSkeleton isMobile={isMobile} />;
  }

  const cardActionsProps = {
    index,
    totalCount,
    onRemove,
    onMoveUp,
    onMoveDown,
  };

  return (
    <Box
      pos="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Paper
        withBorder
        pos="relative"
        radius="md"
        p={CONTENT_PADDING.base}
        style={{
          minHeight: isMobile ? undefined : 160,
          cursor: "pointer",
        }}
      >
        {isMobile ? (
          <Group align="flex-start" wrap="nowrap" gap="sm">
            <Avatar radius="xl" color="brand" variant="light" size="md">
              {toSavedLocationAvatarLabel(location.name)}
            </Avatar>
            <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
              <Group wrap="nowrap" align="stretch" gap="xs">
                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                  <CityCardTitleLink
                    homePath={homePath}
                    name={location.name}
                    ariaLabel={openHomeAriaLabel}
                    lineClamp={1}
                  />
                  {shouldShowLocationSubtitle ? (
                    <Text c="dimmed" fz="sm" lineClamp={1}>
                      {locationSubtitle}
                    </Text>
                  ) : null}
                </Stack>
                <Box style={{ alignSelf: "center", flexShrink: 0 }}>
                  <CityCardActions
                    {...cardActionsProps}
                    isMobile={true}
                    isVisible={true}
                  />
                </Box>
              </Group>
              <CityCardStatusContent cardState={cardState} isMobile={true} />
            </Stack>
          </Group>
        ) : (
          <Stack gap={CONTENT_GAP} justify="space-between" h="100%">
            <Stack gap={4}>
              <CityCardTitleLink
                homePath={homePath}
                name={location.name}
                ariaLabel={openHomeAriaLabel}
                lineClamp={2}
              />
              {shouldShowLocationSubtitle ? (
                <Text c="dimmed" fz="sm" lineClamp={2}>
                  {locationSubtitle}
                </Text>
              ) : null}
            </Stack>
            <CityCardStatusContent cardState={cardState} isMobile={false} />
          </Stack>
        )}
        <CityCardHomeOverlay homePath={homePath} />
      </Paper>

      {!isMobile ? (
        <CityCardActions
          {...cardActionsProps}
          isMobile={false}
          isVisible={isHovered}
        />
      ) : null}
    </Box>
  );
}
