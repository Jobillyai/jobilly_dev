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

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("entry")) {
    return 0;
  }
  if (trimmed.includes("mid")) {
    return 3;
  }
  if (trimmed.includes("senior") || trimmed.includes("lead")) {
    return 8;
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

export type ExperienceLevel = "entry" | "mid" | "senior";

export const EXPERIENCE_LEVEL_OPTIONS: {
  value: ExperienceLevel;
  label: string;
}[] = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
];

export function experienceLevelFromYears(
  years: number | null | undefined,
): ExperienceLevel | null {
  if (years === null || years === undefined) {
    return null;
  }

  if (years <= 1) {
    return "entry";
  }

  if (years <= 5) {
    return "mid";
  }

  return "senior";
}

export function yearsFromExperienceLevel(level: ExperienceLevel): number {
  switch (level) {
    case "entry":
      return 0;
    case "mid":
      return 3;
    case "senior":
      return 8;
  }
}

export function experienceLevelLabel(level: ExperienceLevel): string {
  return (
    EXPERIENCE_LEVEL_OPTIONS.find((option) => option.value === level)?.label ??
    level
  );
}

export function formatExperienceLevel(years: number | null | undefined): string {
  const level = experienceLevelFromYears(years);
  return level ? experienceLevelLabel(level) : "";
}

export function formatExperienceYears(years: number | null | undefined): string {
  if (years === null || years === undefined) {
    return "";
  }

  return formatExperienceLevel(years);
}

/** Job-board search phrases for a candidate tier — no numeric year counts. */
export function experienceLevelSearchTerms(
  years: number | null | undefined,
): string[] {
  const level = experienceLevelFromYears(years);
  if (!level) {
    return [];
  }

  switch (level) {
    case "entry":
      return ["entry level", "entry-level", "junior", "associate", "graduate"];
    case "mid":
      return ["mid level", "mid-level", "intermediate", "experienced"];
    case "senior":
      return ["senior", "lead", "staff", "principal"];
  }
}

/** @deprecated Use experienceLevelSearchTerms — kept for existing imports. */
export function experienceYearsSearchHint(
  years: number | null | undefined,
): string | null {
  const terms = experienceLevelSearchTerms(years);
  return terms.length > 0 ? terms.join(" ") : null;
}
