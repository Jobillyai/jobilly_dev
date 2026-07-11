export const CAREER_ADVISORY_US_TIMEZONE = "America/New_York";
export const CAREER_ADVISORY_INDIA_TIMEZONE = "Asia/Kolkata";

const SESSION_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

const SESSION_DATE_TIME_COMPACT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

function formatInTimeZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(date);
}

export function formatSessionDateTimeUS(date: Date): string {
  return formatInTimeZone(date, CAREER_ADVISORY_US_TIMEZONE, SESSION_DATE_TIME_OPTIONS);
}

export function formatSessionDateTimeIndia(date: Date): string {
  return formatInTimeZone(
    date,
    CAREER_ADVISORY_INDIA_TIMEZONE,
    SESSION_DATE_TIME_OPTIONS,
  );
}

/** Candidate-facing session label — US Eastern time. */
export function formatSessionDateTimeForCandidate(date: Date): string {
  return formatSessionDateTimeUS(date);
}

/** Staff-facing session label — US and India times. */
export function formatSessionDateTimeForStaff(date: Date): string {
  return `${formatSessionDateTimeUS(date)} · ${formatSessionDateTimeIndia(date)}`;
}

export function formatSessionDateTimeForStaffCompact(date: Date): string {
  const us = formatInTimeZone(
    date,
    CAREER_ADVISORY_US_TIMEZONE,
    SESSION_DATE_TIME_COMPACT,
  );
  const india = formatInTimeZone(
    date,
    CAREER_ADVISORY_INDIA_TIMEZONE,
    SESSION_DATE_TIME_COMPACT,
  );
  return `${us} · ${india}`;
}

export function formatSessionDateTimeForStaffHtml(date: Date): string {
  return `
    <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#0a1628;">
      <strong>US (ET):</strong> ${formatSessionDateTimeUS(date)}
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#0a1628;">
      <strong>India (IST):</strong> ${formatSessionDateTimeIndia(date)}
    </p>
  `.trim();
}

export function formatDateTimeLocalInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export function parseDateTimeLocalInZone(
  localValue: string,
  timeZone: string,
): Date | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue.trim());
  if (!matched) {
    return null;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const hour = Number(matched[4]);
  const minute = Number(matched[5]);

  let utcMs = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 8; attempt++) {
    const probe = new Date(utcMs);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(probe);

    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);

    const zonedYear = read("year");
    const zonedMonth = read("month");
    const zonedDay = read("day");
    const zonedHour = read("hour");
    const zonedMinute = read("minute");

    if (
      zonedYear === year &&
      zonedMonth === month &&
      zonedDay === day &&
      zonedHour === hour &&
      zonedMinute === minute
    ) {
      return probe;
    }

    const wanted = Date.UTC(year, month - 1, day, hour, minute);
    const got = Date.UTC(zonedYear, zonedMonth - 1, zonedDay, zonedHour, zonedMinute);
    utcMs += wanted - got;
  }

  return new Date(utcMs);
}

export function formatSessionDateTimeForCandidateShort(date: Date): string {
  return formatInTimeZone(date, CAREER_ADVISORY_US_TIMEZONE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatSessionDateTimeFromIso(
  value: string | null | undefined,
  audience: "candidate" | "staff",
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return audience === "staff"
    ? formatSessionDateTimeForStaffCompact(date)
    : formatSessionDateTimeForCandidate(date);
}
