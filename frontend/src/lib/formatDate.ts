interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
}

interface WeekdayFormatOptions extends DateFormatOptions {
  weekday?: "long" | "short";
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
 * Formats ISO dates into short, AU-style labels, optionally pinned to a specific timezone.
 */
export function formatDateLabel(
  date: string,
  options?: DateFormatOptions,
): string {
  const locale = options?.locale ?? "en-AU";

  return formatWithIntl(
    date,
    locale,
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
    },
    options?.timeZone,
  );
}

/**
 * Formats ISO dates into weekday labels, optionally pinned to a specific timezone.
 */
export function formatWeekdayLabel(
  date: string,
  options?: WeekdayFormatOptions,
): string {
  const locale = options?.locale ?? "en-AU";

  return formatWithIntl(
    date,
    locale,
    {
      weekday: options?.weekday ?? "long",
    },
    options?.timeZone,
  );
}
