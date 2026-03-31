interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
}

interface WeekdayFormatOptions extends DateFormatOptions {
  weekday?: "long" | "short";
}

function getBrowserTimeZone(): string | undefined {
  if (typeof Intl === "undefined") {
    return undefined;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function formatWithIntl(
  date: string,
  locale: string,
  formatOptions: Intl.DateTimeFormatOptions,
  timeZone?: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      ...formatOptions,
      timeZone,
    }).format(new Date(date));
  } catch {
    return new Intl.DateTimeFormat(locale, formatOptions).format(
      new Date(date),
    );
  }
}

/**
 * Formats ISO dates into short, AU-style labels in browser local time by default.
 */
export function formatDateLabel(
  date: string,
  options?: DateFormatOptions,
): string {
  const locale = options?.locale ?? "en-AU";
  const timeZone = options?.timeZone ?? getBrowserTimeZone();

  return formatWithIntl(
    date,
    locale,
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
    },
    timeZone,
  );
}

/**
 * Formats ISO dates into weekday labels in browser local time by default.
 */
export function formatWeekdayLabel(
  date: string,
  options?: WeekdayFormatOptions,
): string {
  const locale = options?.locale ?? "en-AU";
  const timeZone = options?.timeZone ?? getBrowserTimeZone();

  return formatWithIntl(
    date,
    locale,
    {
      weekday: options?.weekday ?? "long",
    },
    timeZone,
  );
}
