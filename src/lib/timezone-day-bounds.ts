/** Local calendar date YYYY-MM-DD in an IANA timezone. */
export function getLocalDateString(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseLocalDate(localDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = localDate.split("-").map(Number);
  return { year, month, day };
}

function formatLocalParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function localDateTimeToUtc(
  localDate: string,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const { year, month, day } = parseLocalDate(localDate);
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);

  let utcMs = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatLocalParts(new Date(utcMs), timeZone);
    const actual = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    utcMs += desired - actual;
  }

  return new Date(utcMs);
}

function addLocalDays(localDate: string, days: number): string {
  const { year, month, day } = parseLocalDate(localDate);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/** UTC instants for [start, end) of a local calendar day. */
export function getLocalDayBoundsUtc(
  localDate: string,
  timeZone: string,
): { start: Date; end: Date } {
  const start = localDateTimeToUtc(localDate, 0, 0, 0, timeZone);
  const end = localDateTimeToUtc(addLocalDays(localDate, 1), 0, 0, 0, timeZone);
  return { start, end };
}

export function getApplicationsDigestTimezone(): string {
  return process.env.APPLICATIONS_DIGEST_TIMEZONE?.trim() || "America/New_York";
}
