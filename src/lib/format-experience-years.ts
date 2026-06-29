/** Parse spreadsheet / form values like "2", "2 years", "0.5" into whole years. */
export function parseExperienceYears(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0 || value > 50) {
      return null;
    }
    return Math.round(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 50) {
    return null;
  }

  return Math.round(parsed);
}

export function formatExperienceYears(years: number | null | undefined): string {
  if (years === null || years === undefined) {
    return "";
  }

  if (years === 0) {
    return "Fresher (0 years)";
  }

  if (years === 1) {
    return "1 year";
  }

  return `${years} years`;
}

export function experienceYearsSearchHint(years: number | null | undefined): string | null {
  if (years === null || years === undefined) {
    return null;
  }

  if (years <= 1) {
    return "entry level junior associate graduate";
  }

  if (years <= 3) {
    return "mid level";
  }

  return "senior lead";
}
