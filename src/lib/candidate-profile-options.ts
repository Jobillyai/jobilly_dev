export const CANDIDATE_GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

export function formatCandidateGender(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const match = CANDIDATE_GENDER_OPTIONS.find((option) => option.value === value);
  return match?.label ?? value;
}

export function parseGraduationYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  if (parsed < 1950 || parsed > currentYear + 1) {
    return null;
  }

  return parsed;
}
