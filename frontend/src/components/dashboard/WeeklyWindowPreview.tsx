import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  buildDashboardHomePath,
  type SavedDashboardCard,
} from "@/domain/dashboard";
import { sports } from "@/domain/sport";
import {
  getRiskBadgeForegroundColor,
  getRiskColor,
  getRiskLevelI18nKeys,
  toRiskLevel,
} from "@/domain/riskRegistry";
import type { Weekday } from "@/domain/weeklyWindow";
import {
  resolveWeeklyWindowPreview,
  type WeeklyPreviewSource,
} from "@/domain/weeklyWindowPreview";
import { toIntlLocale } from "@/i18n/language";
import { formatWeeklyForecastTime } from "@/lib/weeklyWindowLabels";

interface WeeklyWindowPreviewProps {
  cards: SavedDashboardCard[];
  getSource: (card: SavedDashboardCard) => WeeklyPreviewSource;
}

/** Session-only integration example; deliberately does not define shared persistence. */
export function WeeklyWindowPreview({
  cards,
  getSource,
}: WeeklyWindowPreviewProps) {
  const { t, i18n } = useTranslation();
  const locale = toIntlLocale(i18n.resolvedLanguage);
  const [cardId, setCardId] = useState<string | null>(null);
  const [weekday, setWeekday] = useState("2");
  const [start, setStart] = useState("1080");
  const [end, setEnd] = useState("1200");
  const [now, setNow] = useState(() => new Date());
  const card = cards.find((item) => item.id === cardId) ?? cards[0];
  const preview = card
    ? resolveWeeklyWindowPreview(
        {
          weekdays: [Number(weekday) as Weekday],
          startMinutes: Number(start),
          endMinutes: Number(end),
        },
        getSource(card),
        now,
      )
    : null;
  const scheduledWindow =
    preview && "window" in preview ? preview.window : null;
  const nextStart = scheduledWindow?.startUtc;
  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshClock();
    };
    // At the exact start the occurrence is still valid; roll forward just after it.
    const delay = nextStart
      ? Math.min(60_000, Math.max(1, Date.parse(nextStart) - now.getTime() + 1))
      : 60_000;
    const timer = window.setTimeout(refreshClock, delay);
    window.addEventListener("focus", refreshClock);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshClock);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [nextStart, now]);
  const updateSelection = (
    setter: (value: string) => void,
    value: string | null,
  ) => {
    if (value === null) return;
    setter(value);
    setNow(new Date());
  };
  const titleFor = (item: SavedDashboardCard) =>
    t("dashboard.cards.title", {
      sport: t(
        sports.find((sport) => sport.type === item.sport)?.labelKey ??
          "home.sections.filters.selectedSportFallback",
      ),
      location: item.name,
    });
  const weekdayOptions = Array.from({ length: 7 }, (_, day) => ({
    value: String(day),
    label: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, 0, 4 + day))),
  }));
  const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
    value: String(hour * 60),
    label: new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, 0, 1, hour))),
  }));
  const timeLabel = (instant: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: scheduledWindow!.timeZone,
    }).format(new Date(instant));

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t("weeklyPreview.title")}</Title>
          <Badge variant="light">{t("weeklyPreview.badge")}</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {t("weeklyPreview.description")}
        </Text>
        {cards.length === 0 ? (
          <Text>{t("weeklyPreview.empty")}</Text>
        ) : (
          <>
            <Select
              label={t("weeklyPreview.card")}
              value={card?.id ?? null}
              onChange={(value) => updateSelection(setCardId, value)}
              data={cards.map((item) => ({
                value: item.id,
                label: titleFor(item),
              }))}
              allowDeselect={false}
            />
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Select
                label={t("weeklyPreview.weekday")}
                value={weekday}
                data={weekdayOptions}
                allowDeselect={false}
                onChange={(value) => updateSelection(setWeekday, value)}
              />
              <Select
                label={t("weeklyPreview.start")}
                value={start}
                data={hourOptions}
                allowDeselect={false}
                onChange={(value) => updateSelection(setStart, value)}
              />
              <Select
                label={t("weeklyPreview.end")}
                value={end}
                data={[
                  ...hourOptions.slice(1),
                  { value: "1440", label: t("weeklyPreview.midnight") },
                ]}
                allowDeselect={false}
                onChange={(value) => updateSelection(setEnd, value)}
              />
            </SimpleGrid>
            <Text size="sm" c="dimmed">
              {t("weeklyPreview.rules")}
            </Text>
            <Stack gap="sm" role="status" aria-live="polite">
              {scheduledWindow && (
                <>
                  <Title order={3}>{t("weeklyPreview.next")}</Title>
                  <Text fw={600}>
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: scheduledWindow.timeZone,
                    }).format(new Date(scheduledWindow.startUtc))}
                  </Text>
                  <Text>
                    {timeLabel(scheduledWindow.startUtc)} –{" "}
                    {end === "1440"
                      ? t("weeklyPreview.nextDayTime", {
                          time: timeLabel(scheduledWindow.endUtc),
                        })
                      : timeLabel(scheduledWindow.endUtc)}{" "}
                    · {scheduledWindow.timeZone}
                  </Text>
                </>
              )}
              {preview && preview.status !== "ok" && (
                <Alert color={preview.status === "loading" ? "blue" : "yellow"}>
                  {t(`weeklyPreview.status.${preview.status}`)}
                </Alert>
              )}
            </Stack>
            {preview?.status === "ok" && (
              <>
                <Text size="sm">{t("weeklyPreview.samples")}</Text>
                <Table captionSide="top" striped withTableBorder>
                  <Table.Caption>
                    {t("weeklyPreview.tableCaption")}
                  </Table.Caption>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("weeklyPreview.time")}</Table.Th>
                      <Table.Th>{t("weeklyPreview.risk")}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {preview.points.map((point) => {
                      const localTime = formatWeeklyForecastTime(
                        point.time_local,
                        locale,
                      )!;
                      const risk = toRiskLevel(
                        point.heat_risk.risk_level_interpolated,
                      );
                      return (
                        <Table.Tr key={point.time_utc}>
                          <Table.Td>
                            {localTime.dateKey !== preview.window.localDate
                              ? t("weeklyPreview.nextDayTime", {
                                  time: localTime.label,
                                })
                              : localTime.label}
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={getRiskColor(risk)}
                              c={getRiskBadgeForegroundColor(risk)}
                            >
                              {t(getRiskLevelI18nKeys(risk).levelKey)}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </>
            )}
            {card && (
              <Button
                component={Link}
                to={buildDashboardHomePath(card.sport, card.displayLabel)}
                variant="light"
              >
                {t("weeklyPreview.openHome")}
              </Button>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
