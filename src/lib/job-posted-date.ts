const DAY_MS = 24 * 60 * 60 * 1000;

function subtractDays(from: Date, days: number): string {
  const next = new Date(from);
  next.setDate(next.getDate() - days);
  return next.toISOString();
}

function subtractHours(from: Date, hours: number): string {
  const next = new Date(from);
  next.setHours(next.getHours() - hours);
  return next.toISOString();
}

/** Parse board posting labels (Today, 3 days ago) or ISO/timestamp values. */
export function parseJobPostedDate(raw: unknown, referenceDate = new Date()): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  }

  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const direct = Date.parse(trimmed);
  if (!Number.isNaN(direct)) {
    return new Date(direct).toISOString();
  }

  const lower = trimmed.toLowerCase();

  if (
    lower === "today" ||
    lower.includes("just posted") ||
    lower.includes("just now") ||
    lower.includes("active today")
  ) {
    return referenceDate.toISOString();
  }

  if (lower === "yesterday") {
    return subtractDays(referenceDate, 1);
  }

  const hoursMatch = lower.match(/(\d+)\+?\s*hours?\s*ago/);
  if (hoursMatch) {
    return subtractHours(referenceDate, Number(hoursMatch[1]));
  }

  const daysMatch = lower.match(/(\d+)\+?\s*days?\s*ago/);
  if (daysMatch) {
    return subtractDays(referenceDate, Number(daysMatch[1]));
  }

  const weeksMatch = lower.match(/(\d+)\+?\s*weeks?\s*ago/);
  if (weeksMatch) {
    return subtractDays(referenceDate, Number(weeksMatch[1]) * 7);
  }

  const monthsMatch = lower.match(/(\d+)\+?\s*months?\s*ago/);
  if (monthsMatch) {
    return subtractDays(referenceDate, Number(monthsMatch[1]) * 30);
  }

  if (lower.includes("30+ days")) {
    return subtractDays(referenceDate, 30);
  }

  const shortDayMatch = lower.match(/^(\d+)d$/);
  if (shortDayMatch) {
    return subtractDays(referenceDate, Number(shortDayMatch[1]));
  }

  const shortWeekMatch = lower.match(/^(\d+)w$/);
  if (shortWeekMatch) {
    return subtractDays(referenceDate, Number(shortWeekMatch[1]) * 7);
  }

  const shortMonthMatch = lower.match(/^(\d+)mo$/);
  if (shortMonthMatch) {
    return subtractDays(referenceDate, Number(shortMonthMatch[1]) * 30);
  }

  return null;
}

export function extractJobPostedDate(raw: Record<string, unknown>): string | null {
  const candidates = [
    raw.postedAt,
    raw.posted_at,
    raw.postedDate,
    raw.datePosted,
    raw.datePublished,
    raw.dateOnIndeed,
    raw.postedAtTimestamp,
    raw.postedAtUtc,
    raw.publishedAt,
    raw.pubDate,
  ];

  for (const value of candidates) {
    const parsed = parseJobPostedDate(value);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export function postedDateAgeMs(
  postedAt: string | null | undefined,
  referenceDate = new Date(),
): number | null {
  if (!postedAt) {
    return null;
  }

  const postedMs = new Date(postedAt).getTime();
  if (Number.isNaN(postedMs)) {
    return null;
  }

  return referenceDate.getTime() - postedMs;
}

export function isPostedWithinDays(
  postedAt: string | null | undefined,
  days: number,
  referenceDate = new Date(),
): boolean {
  const ageMs = postedDateAgeMs(postedAt, referenceDate);
  if (ageMs === null) {
    return false;
  }

  return ageMs >= 0 && ageMs < days * DAY_MS;
}
