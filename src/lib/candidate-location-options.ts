export type CandidateLocationOption = {
  value: string;
  label: string;
  /** IANA timezone. Empty means use browser timezone when selected. */
  timezone: string;
};

export const CANDIDATE_LOCATION_OPTIONS: readonly CandidateLocationOption[] = [
  { value: "", label: "Select location", timezone: "" },
  { value: "New York, USA", label: "New York, USA", timezone: "America/New_York" },
  { value: "New Jersey, USA", label: "New Jersey, USA", timezone: "America/New_York" },
  { value: "Massachusetts, USA", label: "Massachusetts, USA", timezone: "America/New_York" },
  { value: "Pennsylvania, USA", label: "Pennsylvania, USA", timezone: "America/New_York" },
  { value: "Georgia, USA", label: "Georgia, USA", timezone: "America/New_York" },
  { value: "Illinois, USA", label: "Illinois, USA", timezone: "America/Chicago" },
  { value: "Texas, USA", label: "Texas, USA", timezone: "America/Chicago" },
  { value: "Colorado, USA", label: "Colorado, USA", timezone: "America/Denver" },
  { value: "Arizona, USA", label: "Arizona, USA", timezone: "America/Phoenix" },
  { value: "California, USA", label: "California, USA", timezone: "America/Los_Angeles" },
  { value: "Washington, USA", label: "Washington, USA", timezone: "America/Los_Angeles" },
  { value: "Hyderabad, India", label: "Hyderabad, India", timezone: "Asia/Kolkata" },
  { value: "Bengaluru, India", label: "Bengaluru, India", timezone: "Asia/Kolkata" },
  { value: "Chennai, India", label: "Chennai, India", timezone: "Asia/Kolkata" },
  { value: "Mumbai, India", label: "Mumbai, India", timezone: "Asia/Kolkata" },
  { value: "Pune, India", label: "Pune, India", timezone: "Asia/Kolkata" },
  { value: "Delhi NCR, India", label: "Delhi NCR, India", timezone: "Asia/Kolkata" },
  { value: "Other", label: "Other", timezone: "" },
] as const;

export function getTimezoneForLocation(location: string): string | null {
  const match = CANDIDATE_LOCATION_OPTIONS.find((option) => option.value === location);
  if (!match || !match.value || !match.timezone) {
    return null;
  }

  return match.timezone;
}

export function getBrowserTimezone(): string | null {
  if (typeof Intl === "undefined") {
    return null;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function resolveTimezoneForLocation(
  location: string,
  fallbackTimezone?: string | null,
): string | null {
  return getTimezoneForLocation(location) || fallbackTimezone || getBrowserTimezone();
}

export function isValidIanaTimezone(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function formatTimezoneLabel(timezone: string | null | undefined): string {
  if (!timezone) {
    return "—";
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const shortName = parts.find((part) => part.type === "timeZoneName")?.value;
    return shortName ? `${timezone} (${shortName})` : timezone;
  } catch {
    return timezone;
  }
}
