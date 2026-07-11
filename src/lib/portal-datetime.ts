export const PORTAL_DISPLAY_TIME_ZONES = [
  {
    timeZone: "Asia/Kolkata",
    region: "India",
    label: "IST",
  },
  {
    timeZone: "America/New_York",
    region: "United States",
    label: "ET",
  },
] as const;

export type PortalZoneSnapshot = {
  region: string;
  label: string;
  weekday: string;
  date: string;
  time: string;
};

const WEEKDAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

function formatInZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(date);
}

export function getPortalZoneSnapshots(date: Date): PortalZoneSnapshot[] {
  return PORTAL_DISPLAY_TIME_ZONES.map((zone) => ({
    region: zone.region,
    label: zone.label,
    weekday: formatInZone(date, zone.timeZone, WEEKDAY_FORMAT),
    date: formatInZone(date, zone.timeZone, DATE_FORMAT),
    time: formatInZone(date, zone.timeZone, TIME_FORMAT),
  }));
}
